'use client'

import { useState } from 'react'
import { Channel } from '@prisma/client'
import { DirectChat } from '@prisma/client'
import Link from 'next/link'
import { Trash2, Plus } from 'lucide-react'
import { useChannelSocket } from '@/hooks/useSocket'
import { DirectMessagesList } from './DirectMessagesList'

interface ChannelSwitcherProps {
  channels: Channel[]
  currentChannelId: string
  directChats: DirectChat[]
  currentUserId: string
}

export function ChannelSwitcher({ channels, currentChannelId, directChats, currentUserId }: ChannelSwitcherProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const { isConnected, createChannel, deleteChannel } = useChannelSocket(currentUserId)

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

  const handleDeleteChannel = async (channel: Channel) => {
    console.log('Attempting to delete channel:', { id: channel.id, name: channel.name })
    deleteChannel(channel.id)
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Channels
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Create new channel"
          >
            <Plus size={16} />
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
                  onClick={() => handleDeleteChannel(channel)}
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

      <div className="border-t border-gray-200" />

      <DirectMessagesList 
        directChats={directChats}
        currentUserId={currentUserId}
      />
    </div>
  )
} 