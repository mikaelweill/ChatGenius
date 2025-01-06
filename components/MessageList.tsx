'use client'

import { useEffect, useState } from "react"

type Message = {
  id: string
  content: string
  createdAt: Date
  author: {
    name: string
    email: string
  }
}

type MessageListProps = {
  initialMessages: Message[]
  channelId: string
}

export function MessageList({ initialMessages, channelId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/messages?channelId=${channelId}`)
      const newMessages = await response.json()
      setMessages(newMessages)
    }, 3000)

    return () => clearInterval(interval)
  }, [channelId])

  return (
    <div className="p-6 space-y-6">
      {messages.map((message) => (
        <div key={message.id} className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-full bg-gray-300"></div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="font-semibold">{message.author.name}</span>
              <span className="text-sm text-gray-500">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-gray-700">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

