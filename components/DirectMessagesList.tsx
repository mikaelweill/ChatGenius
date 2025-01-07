'use client'

import { DirectChat, User } from '@prisma/client'

type DirectChatWithParticipants = DirectChat & {
  participants: {
    id: string
    name: string
    email: string
  }[]
  otherUser: {
    id: string
    name: string
    email: string
  }
}

export function DirectMessagesList({
  directChats
}: {
  directChats: DirectChatWithParticipants[]
}) {
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
              <div key={chat.id} className="px-2 py-1 text-sm text-gray-300">
                @ {chat.otherUser.name}
              </div>
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