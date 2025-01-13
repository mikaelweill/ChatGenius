'use client'

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { TokenManager } from '@/lib/tokenManager'
import { Message, Channel } from '@prisma/client'
import { useRouter, usePathname } from 'next/navigation'
import { MessageWithAuthorAndReactions } from '../types/message'

// Types
interface ServerToClientEvents {
  message_received: (message: MessageWithAuthorAndReactions) => void
  message_updated: (message: MessageWithAuthorAndReactions) => void
  dm_message_received: (message: MessageWithAuthorAndReactions) => void
  channel_created: (channel: Channel) => void
  channel_delete: (channelId: string) => void
  channel_error: (error: { message: string }) => void
  initial_statuses: (statuses: Array<{ userId: string, status: 'online' | 'offline', updatedAt: Date }>) => void
  status_update: (status: { userId: string, status: 'online' | 'offline', updatedAt: Date }) => void
  reaction_added: (data: { messageId: string, reaction: any }) => void
  reaction_removed: (data: { messageId: string, reactionId: string }) => void
  dm_created: (chat: any) => void
  user_disconnected: (userId: string) => void
}

interface ClientToServerEvents {
  join_channel: (channelId: string) => void
  join_dm: (data: { dmId: string }) => void
  new_message: (data: { 
    content: string
    channelId: string
    parentId?: string
    isDM?: boolean
    isAICommand?: boolean
    attachment?: {
      url: string
      type: string
      name: string
    }
  }) => void
  new_dm_message: (data: { 
    content: string
    dmId: string
    parentId?: string
    isAICommand?: boolean
    attachment?: {
      url: string
      type: string
      name: string
    }
  }) => void
  channel_create: (data: { name: string, description?: string }) => void
  channel_delete: (channelId: string) => void
  status: (data: { userId: string, status: 'online' | 'offline', updatedAt: Date }) => void
  add_reaction: (data: { messageId: string, emoji: string, channelId: string }) => void
  user_signup: (data: any) => void
  request_statuses: () => void
}

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
  isConnected: boolean
  currentRoom: string | null
  error: Error | null
  connect: () => void
  disconnect: () => void
  joinRoom: (roomId: string, isDM?: boolean) => void
}

interface SocketProviderProps {
  children: ReactNode
  userId: string
}

// Context
const SocketContext = createContext<SocketContextType | null>(null)

// Singleton socket instance
export let sharedSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

// Add debug logging
const debugLog = (message: string, data: any) => {
  console.log(`🔍 [DEBUG] ${message}:`, JSON.stringify(data, null, 2))
}

// Helper function to get or create socket
const getSocket = (userId: string): Socket<ServerToClientEvents, ClientToServerEvents> | null => {
  // ALWAYS use TokenManager's userId - this is our source of truth
  const tokenManagerUserId = TokenManager.getUserId()
  
  if (!tokenManagerUserId) {
    console.error('🔌 No userId in TokenManager - cannot create socket')
    return null
  }

  // Verify userId matches TokenManager
  if (userId !== tokenManagerUserId) {
    console.error('🔌 UserId mismatch:', { 
      providedUserId: userId, 
      tokenManagerUserId 
    })
    return null
  }

  // Always clean up any existing socket
  if (sharedSocket) {
    debugLog('Cleaning up existing socket', {
      existingSocketId: sharedSocket.id,
      newUserId: userId,
      tokenManagerId: TokenManager.getUserId(),
      timestamp: new Date().toISOString()
    })
    
    sharedSocket.removeAllListeners()
    sharedSocket.disconnect()
    sharedSocket = null
  }

  const socketUrl = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'http://localhost:3000'

  // Generate a unique connection ID
  const connectionId = `${tokenManagerUserId}-${Date.now()}-${Math.random().toString(36).slice(2)}`

  try {
    debugLog('Creating socket', {
      userId,
      tokenManagerId: TokenManager.getUserId(),
      timestamp: new Date().toISOString()
    })

    // Always create a new socket using TokenManager's userId
    const newSocket = io(socketUrl, {
      auth: { 
        userId: tokenManagerUserId,  // ALWAYS use TokenManager's userId
        connectionId 
      },
      forceNew: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    }) as Socket<ServerToClientEvents, ClientToServerEvents>

    debugLog('Socket created', {
      socketId: newSocket.id,
      userId,
      timestamp: new Date().toISOString()
    })

    // Add connection verification
    newSocket.on('connect', () => {
      const currentTokenUserId = TokenManager.getUserId()
      if (currentTokenUserId !== tokenManagerUserId) {
        console.error('🔌 UserId changed during connection:', {
          originalUserId: tokenManagerUserId,
          currentUserId: currentTokenUserId
        })
        newSocket.disconnect()
        sharedSocket = null
        return
      }
    })

    // Set as shared socket for cleanup purposes
    sharedSocket = newSocket
    return newSocket
  } catch (error) {
    console.error('🔌 Error creating socket:', error)
    return null
  }
}

// Provider
export function SocketProvider({ children, userId }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!userId) {
      console.log('🔌 No userId provided to SocketProvider')
      return
    }

    try {
      console.log('🔌 Initializing socket with userId:', userId)
      const socket = getSocket(userId)

      if (!socket) {
        console.log('🔌 No socket created')
        return
      }

      const onConnect = () => {
        if (!socket) {
          console.error('No socket available for connection')
          return
        }

        debugLog('Socket connected', {
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        })

        setIsConnected(true)
        setError(null)
      }

      const onDisconnect = (reason: string) => {
        debugLog('Socket disconnected', {
          reason,
          socketId: socket?.id,
          userId,
          tokenManagerId: TokenManager.getUserId(),
          timestamp: new Date().toISOString()
        })
        
        setIsConnected(false)
        setCurrentRoom(null)
      }

      const onConnectError = (err: Error) => {
        console.error('🔌 Socket connect error:', err)
        setError(err)
      }

      const onChannelError = (error: { message: string }) => {
        console.error('🔌 Channel error:', error.message)
        setError(new Error(error.message))
      }

      // Setup listeners
      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('connect_error', onConnectError)
      socket.on('channel_error', onChannelError)

      if (socket.connected) {
        console.log('🔌 Socket already connected:', socket.id)
        onConnect()
      } else {
        console.log('🔌 Socket not connected, attempting connection...')
      }

      // Cleanup
      return () => {
        console.log('🔌 Cleaning up socket listeners')
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('connect_error', onConnectError)
        socket.off('channel_error', onChannelError)
      }
    } catch (err) {
      console.error('🔌 Error initializing socket:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }, [userId])

  const value: SocketContextType = {
    socket: sharedSocket,
    isConnected,
    currentRoom,
    error,
    connect: () => sharedSocket?.connect(),
    disconnect: () => {
      if (sharedSocket) {
        sharedSocket.disconnect()
        sharedSocket = null
      }
    },
    joinRoom: (roomId: string, isDM = false) => {
      if (!sharedSocket || !isConnected) {
        console.log('Cannot join room - socket not connected')
        return
      }

      try {
        if (currentRoom === roomId) {
          console.log('Already in room:', roomId)
          return
        }

        if (isDM) {
          sharedSocket.emit('join_dm', { dmId: roomId })
        } else {
          sharedSocket.emit('join_channel', roomId)
        }
        
        setCurrentRoom(roomId)
        console.log(`Joined ${isDM ? 'DM' : 'channel'} room:`, roomId)
      } catch (err) {
        console.error('Error joining room:', err)
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    }
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

// Hook for consuming socket context
export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

// Room-specific hook
export function useSocketRoom({ channelId, isDM = false }: { channelId: string, isDM?: boolean }) {
  const { socket, isConnected, currentRoom, joinRoom } = useSocket()
  const [messages, setMessages] = useState<MessageWithAuthorAndReactions[]>([])
  const [isJoining, setIsJoining] = useState(false)

  // Handle room joining
  useEffect(() => {
    if (!socket || !isConnected || isJoining || currentRoom === channelId) return

    setIsJoining(true)
    joinRoom(channelId, isDM)
    
    const timer = setTimeout(() => {
      setIsJoining(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [socket, isConnected, channelId, isDM, joinRoom, currentRoom, isJoining])

  // Handle message events
  useEffect(() => {
    if (!socket || !isConnected) return

    const onMessage = (message: MessageWithAuthorAndReactions) => {
      if (message.channelId === channelId || message.directChatId === channelId) {
        setMessages(prev => [...prev, message])
      }
    }

    socket.on(isDM ? 'dm_message_received' : 'message_received', onMessage)

    return () => {
      socket.off(isDM ? 'dm_message_received' : 'message_received', onMessage)
    }
  }, [socket, isConnected, channelId, isDM])

  // Handle reaction and message update events separately
  useEffect(() => {
    if (!socket || !isConnected) return

    const onMessageUpdated = (message: MessageWithAuthorAndReactions) => {
      if (message.channelId === channelId || message.directChatId === channelId) {
        setMessages(prev => prev.map(m => m.id === message.id ? message : m))
      }
    }

    socket.on('message_updated', onMessageUpdated)
    socket.on('reaction_added', ({ messageId, reaction }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, reactions: [...m.reactions, reaction] }
          : m
      ))
    })

    socket.on('reaction_removed', ({ messageId, reactionId }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, reactions: m.reactions.filter(r => r.id !== reactionId) }
          : m
      ))
    })

    return () => {
      socket.off('message_updated', onMessageUpdated)
      socket.off('reaction_added')
      socket.off('reaction_removed')
    }
  }, [socket, isConnected, channelId])

  return {
    socket,
    isConnected,
    currentRoom,
    messages,
    sendMessage: (content: string, parentId?: string, attachment?: { url: string, type: string, name: string }) => {
      if (!socket || !isConnected) return

      if (isDM) {
        socket.emit('new_dm_message', {
          content,
          dmId: channelId,
          parentId,
          isAICommand: false,
          attachment
        })
      } else {
        socket.emit('new_message', {
          content,
          channelId,
          parentId,
          isDM,
          isAICommand: false,
          attachment
        })
      }
    }
  }
}

// Channel Operations Hook
export function useChannelOperations() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useChannelOperations must be used within a SocketProvider')
  }

  const { socket, isConnected, currentRoom } = context
  const router = useRouter()
  const pathname = usePathname()
  const segments = pathname.split('/')
  const currentChannelName = segments[2] // /channels/[name]

  useEffect(() => {
    if (!socket) return

    const onChannelDeleted = (channelId: string) => {
      console.log('🔌 Channel deleted:', channelId)
      
      // If we're in a channel route and it's the deleted channel, redirect to general
      if (segments[1] === 'channels' && currentChannelName && channelId === currentRoom) {
        console.log('🔌 Current channel was deleted, redirecting to general')
        router.push('/channels/general')
      }
    }

    socket.on('channel_delete', onChannelDeleted)

    return () => {
      socket.off('channel_delete', onChannelDeleted)
    }
  }, [socket, router, segments, currentChannelName, currentRoom])

  const createChannel = (name: string, description?: string) => {
    if (!socket || !isConnected) {
      console.error('Cannot create channel - socket not connected')
      return
    }

    console.log('🔌 Emitting channel_create event:', { name, description })
    socket.emit('channel_create', { name, description })
  }

  const deleteChannel = (channelId: string) => {
    if (!socket || !isConnected) {
      console.error('Cannot delete channel - socket not connected')
      return
    }

    console.log('🔌 Emitting channel_delete event:', channelId)
    socket.emit('channel_delete', channelId)

    // If we're in the channel being deleted, redirect immediately
    if (segments[1] === 'channels' && currentChannelName && channelId === currentRoom) {
      console.log('🔌 Current channel was deleted, redirecting to general')
      router.push('/channels/general')
    }
  }

  return {
    socket,
    isConnected,
    createChannel,
    deleteChannel
  }
}

// Reaction hook
export function useReactions(messageId: string, channelId: string) {
  const { socket, isConnected } = useSocket()

  const toggleReaction = (emoji: string) => {
    if (!socket || !isConnected) return

    socket.emit('add_reaction', {
      messageId,
      emoji,
      channelId
    })
  }

  return {
    toggleReaction
  }
}

// Cleanup function for logout
export function cleanupSocket() {
  if (sharedSocket) {
    console.log('Cleaning up socket connection')
    sharedSocket.disconnect()
    sharedSocket = null
  }
}