'use client'

import { useEffect, useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Message } from '@prisma/client'

type MessageWithAuthor = Message & {
  author: {
    name: string
    email: string
  }
}

export function MessageList({ channelId }: { channelId: string }) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>([])
  const { socket, isConnected } = useSocket(channelId)

  useEffect(() => {
    if (!socket) return

    socket.on('message_received', (message: MessageWithAuthor) => {
      setMessages(prev => [...prev, message])
    })

    return () => {
      socket.off('message_received')
    }
  }, [socket])

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
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

