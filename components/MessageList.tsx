'use client'

import { useEffect, useState, useRef, useContext } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Message } from '@prisma/client'
import { Username } from './Username'
import { SessionContext } from '@/components/SessionProvider'

type MessageWithAuthor = Message & {
  author: {
    name: string | null;
    id: string;
    email: string | null;
  }
}

interface MessageListProps {
  initialMessages: MessageWithAuthor[]
  channelId: string
  currentUserId: string
}

export function MessageList({ initialMessages, channelId, currentUserId }: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>(initialMessages)
  const { socket, isConnected } = useSocket({ channelId })
  const containerRef = useRef<HTMLDivElement>(null)
  const session = useContext(SessionContext)

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
    <div key={channelId} className="space-y-4 p-4">
      {messages.map((message) => (
        <div key={message.id} className="flex items-start gap-3 group hover:bg-gray-100 p-2 rounded-lg transition-colors">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-medium shadow-sm">
              {message.author.name?.[0].toUpperCase() || 'A'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Username 
                userId={message.authorId}
                name={message.author.name}
                currentUserId={currentUserId}
              />
              <span className="text-xs text-gray-500 group-hover:opacity-100 opacity-0 transition-opacity">
                {new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            <p className="text-gray-700 break-words">{message.content}</p>
          </div>
        </div>
      ))}
      {!isConnected && (
        <div className="sticky bottom-0 text-center p-2 bg-red-50 rounded-lg border border-red-200">
          <span className="text-red-600 font-medium">
            Disconnected - trying to reconnect...
          </span>
        </div>
      )}
    </div>
  )
}

