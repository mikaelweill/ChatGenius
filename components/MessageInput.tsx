'use client'

import { useState } from 'react'
import { useSocket } from '@/hooks/useSocket'

export function MessageInput({ channelId }: { channelId: string }) {
  const [content, setContent] = useState('')
  const { sendMessage, isConnected } = useSocket(channelId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !isConnected) return

    try {
      sendMessage(content)
      setContent('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded"
          disabled={!isConnected}
        />
        <button
          type="submit"
          disabled={!isConnected || !content.trim()}
          className="px-4 py-2 text-white bg-blue-500 rounded disabled:bg-gray-300"
        >
          Send
        </button>
      </div>
    </form>
  )
} 