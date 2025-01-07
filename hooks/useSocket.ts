'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRouter } from 'next/navigation'
import { Channel } from '@prisma/client'

// Create a shared socket instance
let sharedSocket: Socket | null = null

// Add a function to clean up the socket
export const cleanupSocket = () => {
  if (sharedSocket) {
    console.log('Cleaning up socket connection')
    sharedSocket.disconnect()
    sharedSocket = null
  }
}

// Helper function to get or create socket
const getSocket = () => {
  if (sharedSocket) return sharedSocket

  const cookies = document.cookie
  const token = cookies
    .split('; ')
    .find(row => row.startsWith('session-token='))
    ?.split('=')[1]

  if (!token) {
    console.error('No auth token found in cookies')
    window.location.href = '/signin'
    return null
  }

  sharedSocket = io({
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  return sharedSocket
}


// Utility to emit socket events from the server or client
export const emitSocketEvent = async (event: string, data: any) => {
  // This will be implemented in a separate server-side file
  return Promise.resolve();
};
// Message socket hook
// export function useSocket(channelId: string) {
//   const [isConnected, setIsConnected] = useState(false)
//   const socketRef = useRef<Socket>()
//   const currentChannelRef = useRef(channelId) // Track current channel

//   useEffect(() => {
//     const socket = getSocket()
//     if (!socket) return

//     socketRef.current = socket
//     currentChannelRef.current = channelId // Update current channel

//     const handleConnect = () => {
//       console.log('Socket connected with ID:', socket.id)
//       setIsConnected(true)
//       socket.emit('join_channel', channelId)
//     }

//     const handleMessage = (message: any) => {
//       // Only handle messages for current channel
//       if (message.channelId === currentChannelRef.current) {
//         // Handle message
//       }
//     }

//     if (socket.connected) {
//       handleConnect()
//     }

//     socket.on('connect', handleConnect)
//     socket.on('message_received', handleMessage)

//     return () => {
//       socket.off('connect', handleConnect)
//       socket.off('message_received', handleMessage)
//     }
//   }, [channelId]) // Re-run effect when channel changes

//   return {
//     socket: socketRef.current,
//     isConnected,
//     sendMessage: (content: string) => {
//       if (!socketRef.current?.connected) return
//       socketRef.current.emit('new_message', {
//         content,
//         channelId,
//       })
//     }
//   }
// }

export function useSocket(identifier: { channelId?: string; DmID?: string }) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket>();
  const currentIdentifierRef = useRef(identifier); // Track current identifier (channel or DM)

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;
    currentIdentifierRef.current = identifier; // Update current identifier

    console.log("Current identifier:", currentIdentifierRef.current);

    const handleConnect = () => {
      console.log("Socket connected with ID:", socket.id);
      setIsConnected(true);

      if (identifier.channelId) {
        socket.emit("join_channel", identifier.channelId);
      } else if (identifier.DmID) {
        socket.emit("join_dm", identifier.DmID);
      }
    };

    const handleMessage = (message: any) => {
      // Handle messages based on the current identifier
      if (
        (identifier.channelId && message.channelId === currentIdentifierRef.current.channelId) ||
        (identifier.DmID && message.DmID === currentIdentifierRef.current.DmID)
      ) {
        console.log("Message received:", message);
        // Handle the message as required
      }
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("message_received", handleMessage);

    return () => {
      if (identifier.channelId) {
        socket.emit("leave_channel", identifier.channelId);
      } else if (identifier.DmID) {
        socket.emit("leave_dm", identifier.DmID);
      }
      socket.off("connect", handleConnect);
      socket.off("message_received", handleMessage);
    };
  }, [identifier]); // Re-run effect when identifier changes

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage: (content: string) => {
      if (!socketRef.current?.connected) return;

      const payload: any = { content };
      if (identifier.channelId) payload.channelId = identifier.channelId;
      if (identifier.DmID) payload.DmID = identifier.DmID;

      socketRef.current.emit("new_message", payload);
    },
  };
}


// Channel socket hook
export function useChannelSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket>()
  const router = useRouter()

  useEffect(() => {
    const socket = getSocket()
    if (!socket) {
      console.error('Failed to get socket connection')
      return
    }

    socketRef.current = socket

    const handleConnect = () => {
      console.log('Channel socket connected with ID:', socket.id)
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      console.log('Channel socket disconnected')
      setIsConnected(false)
    }

    const handleError = (error: Error) => {
      console.error('Channel socket connection error:', error)
    }

    if (socket.connected) {
      handleConnect()
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleError)
    socket.on('channel_created', (channel: Channel) => {
      console.log('Channel created event received:', channel)
      router.refresh()
    })
    socket.on('channel_delete', (channelId: string) => {
      console.log('Channel deleted event received:', channelId)
      router.push('/channels/general')
      router.refresh()
    })
    socket.on('channel_error', (error: { message: string }) => {
      console.error('Channel operation failed:', error.message)
    })

    return () => {
      // Don't disconnect, just remove listeners
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleError)
      socket.off('channel_created', (channel: Channel) => {
        console.log('Channel created event received:', channel)
        router.refresh()
      })
      socket.off('channel_delete', (channelId: string) => {
        console.log('Channel deleted event received:', channelId)
        router.push('/channels/general')
        router.refresh()
      })
      socket.off('channel_error', (error: { message: string }) => {
        console.error('Channel operation failed:', error.message)
      })
    }
  }, [router])

  return {
    isConnected,
    createChannel: (name: string, description?: string) => {
      if (!socketRef.current) {
        console.error('Socket ref is null')
        return
      }
      if (!socketRef.current.connected) {
        console.error('Socket not connected, status:', socketRef.current.connected)
        return
      }
      console.log('Socket status before create:', {
        id: socketRef.current.id,
        connected: socketRef.current.connected,
        disconnected: socketRef.current.disconnected
      })
      socketRef.current.emit('channel_create', { name, description })
    },
    deleteChannel: (channelId: string) => {
      if (!socketRef.current) {
        console.error('Socket ref is null')
        return
      }
      if (!socketRef.current.connected) {
        console.error('Socket not connected, status:', socketRef.current.connected)
        return
      }
      console.log('Socket status before delete:', {
        id: socketRef.current.id,
        connected: socketRef.current.connected,
        disconnected: socketRef.current.disconnected
      })
      console.log('About to emit channel_delete with channelId:', channelId)
      socketRef.current.emit('channel_delete', channelId)
      console.log('Emitted channel_delete event')
    }
  }
}

// Keep all existing code and add this new hook
export function useDMMessages(dmId: string) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket>()
  const currentDMRef = useRef(dmId)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socketRef.current = socket
    currentDMRef.current = dmId

    const handleConnect = () => {
      console.log('DM socket connected with ID:', socket.id)
      setIsConnected(true)
    }

    const handleMessage = (message: MessageWithAuthor) => {
      if (message.directChatId === currentDMRef.current) {
        setMessages(prev => [...prev, message])
      }
    }

    if (socket.connected) {
      handleConnect()
    }

    socket.on('connect', handleConnect)
    socket.on('dm_message_received', handleMessage)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('dm_message_received', handleMessage)
    }
  }, [dmId])

  return {
    messages,
    isConnected,
    sendMessage: (content: string) => {
      if (!socketRef.current?.connected) return
      socketRef.current.emit('new_dm_message', {
        content,
        chatId: dmId
      })
    }
  }
}

// Add this new hook
export function useDMSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket>()

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socketRef.current = socket

    const handleConnect = () => {
      setIsConnected(true)
    }

    if (socket.connected) {
      handleConnect()
    }

    socket.on('connect', handleConnect)

    return () => {
      socket.off('connect', handleConnect)
    }
  }, [])

  return {
    createDM: (otherUserId: string, callback: (response: { chatId?: string, error?: string }) => void) => {
      if (!socketRef.current?.connected) return
      
      socketRef.current.emit('create_dm', { otherUserId }, callback)
    },
    isConnected
  }
} 