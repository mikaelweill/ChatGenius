'use client'

import { useState } from 'react'
import { useSocket } from '@/hooks/useSocket'

export function MessageInput({ channelId, isDM = false }: { channelId: string, isDM?: boolean }) {
  const [content, setContent] = useState('')
  const { socket, isConnected } = useSocket({ channelId })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !isConnected || !socket) return

    try {
      if (isDM) {
        socket.emit('new_dm_message', { content, chatId: channelId })
      } else {
        socket.emit('new_message', { content, channelId })
      }
      setContent('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          disabled={!isConnected}
        />
        <button
          type="submit"
          disabled={!isConnected || !content.trim()}
          className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  )
} 