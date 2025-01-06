'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket(channelId: string) {
  const socketRef = useRef<Socket>()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const cookies = document.cookie
    const token = cookies
      .split('; ')
      .find(row => row.startsWith('session-token='))
      ?.split('=')[1]

    if (!token) {
      console.error('No auth token found in cookies')
      window.location.href = '/signin'
      return
    }

    const socket = io({
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      socket.emit('join_channel', channelId)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [channelId])

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage: (content: string) => {
      if (!socketRef.current?.connected) return
      socketRef.current.emit('new_message', {
        content,
        channelId,
      })
    }
  }
} 