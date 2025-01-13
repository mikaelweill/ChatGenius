'use client'

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { TokenManager } from '../lib/tokenManager'
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
  join_channel: (data: { channelId: string }) => void
  join_dm: (data: { dmId: string }) => void
  new_message: (data: { 
    content: string
    channelId: string
    parentId?: string
    isDM?: boolean
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
let sharedSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

// Helper function to get or create socket
const getSocket = (userId: string) => {
  if (sharedSocket) return sharedSocket

  const socketUrl = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'http://localhost:3000'

  console.log('🔌 Creating socket connection:', { userId, url: socketUrl })

  sharedSocket = io(socketUrl, {
    auth: { userId },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
    timeout: 10000,
  })

  return sharedSocket
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
      // Get or create the shared socket
      const socket = getSocket(userId)

      const onConnect = () => {
        console.log('🔌 Socket connected successfully:', socket.id)
        setIsConnected(true)
        setError(null)
      }

      const onDisconnect = (reason: string) => {
        console.log('🔌 Socket disconnected:', reason)
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
          sharedSocket.emit('join_channel', { channelId: roomId })
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

  useEffect(() => {
    if (!socket || !isConnected || isJoining) return

    setIsJoining(true)
    joinRoom(channelId, isDM)
    setIsJoining(false)

    const onMessage = (message: MessageWithAuthorAndReactions) => {
      if (message.channelId === channelId || message.directChatId === channelId) {
        setMessages(prev => [...prev, message])
      }
    }

    const onMessageUpdated = (message: MessageWithAuthorAndReactions) => {
      if (message.channelId === channelId || message.directChatId === channelId) {
        setMessages(prev => prev.map(m => m.id === message.id ? message : m))
      }
    }

    socket.on(isDM ? 'dm_message_received' : 'message_received', onMessage)
    socket.on('message_updated', onMessageUpdated)

    return () => {
      socket.off(isDM ? 'dm_message_received' : 'message_received', onMessage)
      socket.off('message_updated', onMessageUpdated)
    }
  }, [socket, isConnected, channelId, isDM, joinRoom, isJoining])

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
          attachment
        })
      } else {
        socket.emit('new_message', {
          content,
          channelId,
          parentId,
          isDM,
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