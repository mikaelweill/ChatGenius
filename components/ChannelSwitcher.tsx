'use client'

import { useState, useEffect } from 'react'
import { Channel } from '@prisma/client'
import Link from 'next/link'
import { Trash2, Plus } from 'lucide-react'
import { useChannelOperations } from '@/hooks/useSocket'
import { DirectMessagesList } from './DirectMessagesList'
import { usePathname } from 'next/navigation'
import { DirectChatWithParticipants } from '@/types/chat'

interface ChannelSwitcherProps {
  channels: Channel[]
  directChats: DirectChatWithParticipants[]
  currentUserId: string
}

export function ChannelSwitcher({ channels: initialChannels, directChats, currentUserId }: ChannelSwitcherProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [channels, setChannels] = useState(initialChannels)
  const { isConnected, createChannel, deleteChannel, socket } = useChannelOperations()
  const pathname = usePathname()
  const segments = pathname.split('/')
  const currentChannelId = channels.find(c => c.name === segments[2])?.id || ''

  // Initialize channels from props
  useEffect(() => {
    setChannels(initialChannels)
  }, [initialChannels])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const onChannelCreated = (channel: Channel) => {
      console.log('🔌 Channel created:', channel)
      setChannels(prev => [...prev, channel])
    }

    const onChannelDeleted = (channelId: string) => {
      console.log('🔌 Channel deleted:', channelId)
      setChannels(prev => prev.filter(c => c.id !== channelId))
    }

    socket.on('channel_created', onChannelCreated)
    socket.on('channel_delete', onChannelDeleted)

    return () => {
      socket.off('channel_created', onChannelCreated)
      socket.off('channel_delete', onChannelDeleted)
    }
  }, [socket])

  console.log('🔌 ChannelSwitcher Socket Status:', { isConnected })

  const isDuplicateName = channels.some(
    channel => channel.name.toLowerCase() === newChannelName.toLowerCase()
  )

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim() || isDuplicateName) return

    console.log('🔌 Creating channel:', { 
      isConnected, 
      newChannelName,
      createChannel: !!createChannel,
      socket: !!socket
    })
    
    try {
      createChannel(newChannelName)
      console.log('🔌 Channel creation request sent')
      setNewChannelName('')
      setIsCreating(false)
    } catch (error) {
      console.error('🔌 Error creating channel:', error)
    }
  }

  const handleDeleteChannel = async (channel: Channel) => {
    console.log('🔌 Deleting channel:', { 
      isConnected, 
      channelId: channel.id,
      channelName: channel.name,
      deleteChannel: !!deleteChannel 
    })
    
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