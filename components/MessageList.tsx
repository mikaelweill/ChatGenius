'use client'

import { useState, useEffect } from "react"

type Message = {
  id: string
  content: string
  author: {
    name: string
  }
  createdAt: string
}

type MessageListProps = {
  channelId: string
}

export default function MessageList({ channelId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    // Fetch messages from API
    const fetchMessages = async () => {
      // Replace with actual API call
      const response = await fetch(`/api/channels/${channelId}/messages`)
      const data = await response.json()
      setMessages(data)
    }

    fetchMessages()
  }, [channelId])

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id} className="mb-4">
          <div className="font-semibold">{message.author.name}</div>
          <div>{message.content}</div>
          <div className="text-xs text-gray-500">{new Date(message.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}

