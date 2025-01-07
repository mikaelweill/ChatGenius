'use client'

import { useState } from 'react'
import { Channel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { useChannelSocket } from '@/hooks/useSocket'

interface ChannelSwitcherProps {
  channels: Channel[]
  currentChannelId: string
}

export function ChannelSwitcher({ channels, currentChannelId }: ChannelSwitcherProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const { createChannel, deleteChannel } = useChannelSocket()

  const isDuplicateName = channels.some(
    channel => channel.name.toLowerCase() === newChannelName.toLowerCase()
  )

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim() || isDuplicateName) return

    console.log('Attempting to create channel:', newChannelName)
    createChannel(newChannelName)
    setNewChannelName('')
    setIsCreating(false)
  }

  const handleDeleteChannel = async (channelName: string) => {
    console.log('Attempting to delete channel:', channelName)
    deleteChannel(channelName)
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
        <form onSubmit={handleCreateChannel} className="px-4 space-y-2">
          <div className="relative">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="New channel name"
                className={`flex-1 px-3 py-2 text-sm bg-gray-700 text-white rounded border 
                  ${isDuplicateName ? 'border-red-500' : 'border-gray-600'}
                  focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false)
                  setNewChannelName('')
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            {isDuplicateName && newChannelName && (
              <div className="absolute -bottom-6 left-0 text-sm text-red-400">
                Channel name already exists
              </div>
            )}
          </div>
        </form>
      )}

      <div className="space-y-0.5">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`group flex items-center justify-between px-4 py-2 ${
              channel.id === currentChannelId 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Link
              href={`/channels/${channel.name}`}
              className="flex-1"
            >
              <span className="flex items-center gap-2">
                <span className="text-gray-400">#</span>
                {channel.name}
              </span>
            </Link>
            {channel.name !== 'general' && (
              <button
                onClick={() => handleDeleteChannel(channel.name)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                aria-label={`Delete ${channel.name} channel`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 