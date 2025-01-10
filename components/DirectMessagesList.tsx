'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DirectChatWithParticipants } from '@/types/chat'

interface DirectMessagesListProps {
  directChats: DirectChatWithParticipants[]
  currentUserId: string
}

export function DirectMessagesList({
  directChats,
  currentUserId
}: DirectMessagesListProps) {
  const router = useRouter()

  useEffect(() => {
    // Refresh the page periodically to check for new DMs
    const interval = setInterval(() => {
      router.refresh()
    }, 5000)  // every 5 seconds

    return () => clearInterval(interval)
  }, [router])

  console.log('DirectMessagesList received:', directChats)

  return (
    <div className="space-y-2">
      <div className="px-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Direct Messages
        </h2>
      </div>
      <div className="space-y-1">
        {directChats && directChats.length > 0 ? (
          directChats.map((chat) => {
            if (!chat.otherUser) {
              console.warn('No other user found for chat:', chat)
              return null
            }
            
            return (
              <Link
                key={chat.id}
                href={`/channels/dm/${chat.otherUser.id}`}
                className="flex items-center px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    chat.otherUser.status === 'online' 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  }`} />
                  <span>@{chat.otherUser.name || 'Anonymous'}</span>
                </div>
              </Link>
            )
          })
        ) : (
          <p className="px-2 py-1 text-sm text-gray-500 italic">
            No direct messages yet
          </p>
        )}
      </div>
    </div>
  )
} 