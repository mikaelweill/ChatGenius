'use client'

import { useState } from 'react'
import { Channel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      router.push(`/channels/${channel.name}`)
      router.refresh()
    } catch (error) {
      console.error('Error creating channel:', error)
    }
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-between items-center px-4">
        <h2 className="text-lg font-semibold text-gray-200">Channels</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="w-6 h-6 rounded hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-xl">+</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateChannel} className="px-4">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="New channel name"
            className="w-full px-3 py-2 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            autoFocus
          />
        </form>
      )}

      <div className="space-y-0.5">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/channels/${channel.name}`}
            className={`block w-full px-4 py-2 text-left transition-colors ${
              channel.id === currentChannelId 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-gray-400">#</span>
              {channel.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
} 