'use client'

import { useEffect, useState, useRef } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Message } from '@prisma/client'

type MessageWithAuthor = Message & {
  author: {
    name: string
    email: true
  }
}

interface MessageListProps {
  initialMessages: MessageWithAuthor[]
  channelId: string
}

export function MessageList({ initialMessages, channelId }: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>(initialMessages)
  const { socket, isConnected } = useSocket(channelId)
  const containerRef = useRef<HTMLDivElement>(null)

  const isNearBottom = () => {
    const container = containerRef.current
    if (!container) return false
    
    const threshold = 100 // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }

  // Scroll whenever messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!socket) return

    socket.on('message_received', (message: MessageWithAuthor) => {
      const wasAtBottom = isNearBottom()
      setMessages(prev => {
        const newMessages = [...prev, message]
        // Only scroll if we were at the bottom
        if (wasAtBottom) {
          // Force a scroll in the next tick
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight
            }
          }, 0)
        }
        return newMessages
      })
    })

    return () => {
      socket.off('message_received')
    }
  }, [socket])

  return (
    <div 
      ref={containerRef}
      style={{ height: 'calc(100vh - 200px)' }} // Fixed height
      className="flex-1 p-4 space-y-4 overflow-y-auto"
    >
      {messages.map((message) => (
        <div key={message.id} className="flex items-start gap-2">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              {message.author.name[0].toUpperCase()}
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">{message.author.name}</span>
              <span className="text-xs text-gray-500">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-gray-700">{message.content}</p>
          </div>
        </div>
      ))}
      {!isConnected && (
        <div className="text-center text-red-500">
          Disconnected - trying to reconnect...
        </div>
      )}
    </div>
  )
}

