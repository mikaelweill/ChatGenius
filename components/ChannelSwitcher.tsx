'use client'

import { useState } from 'react'
import { Channel } from '@prisma/client'
import { useRouter } from 'next/navigation'

interface ChannelSwitcherProps {
  channels: Channel[]
  currentChannelId: string
}

export function ChannelSwitcher({ channels, currentChannelId }: ChannelSwitcherProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const router = useRouter()

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim()) return

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName }),
      })

      if (!res.ok) throw new Error('Failed to create channel')
      
      const channel = await res.json()
      setNewChannelName('')
      setIsCreating(false)
      router.push(`/?channel=${channel.id}`) // Navigate to the new channel
      router.refresh() // Refresh the server components
    } catch (error) {
      console.error('Error creating channel:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-4">
        <h2 className="text-lg font-semibold">Channels</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="text-sm text-gray-400 hover:text-white"
        >
          +
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateChannel} className="px-4">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="New channel name"
            className="w-full px-2 py-1 text-sm text-black rounded"
          />
        </form>
      )}

      <div className="space-y-1">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => router.push(`/?channel=${channel.id}`)}
            className={`w-full px-4 py-1 text-left hover:bg-gray-700 ${
              channel.id === currentChannelId ? 'bg-gray-700' : ''
            }`}
          >
            # {channel.name}
          </button>
        ))}
      </div>
    </div>
  )
} 