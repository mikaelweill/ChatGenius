'use client'

import { useState } from 'react'

type MessageInputProps = {
  channelId: string
}

export function MessageInput({ channelId }: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          channelId,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message #general"
        className="w-full px-4 py-2 rounded-md border"
      />
    </form>
  )
} 