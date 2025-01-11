'use client'

import { useState } from 'react'
import { Socket } from 'socket.io-client'
import { Smile } from 'lucide-react'

interface ReactionUser {
  id: string
  name: string | null
}

interface Reaction {
  id: string
  emoji: string
  user: ReactionUser
}

interface ReactionProps {
  messageId: string
  channelId: string
  currentUserId: string
  reactions: Reaction[]
  socket: Socket | null
  buttonClassName?: string
  emojiPickerClassName?: string
}

export function ReactionComponent({
  messageId,
  channelId,
  currentUserId,
  reactions,
  socket,
  buttonClassName = "p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full",
  emojiPickerClassName = "absolute left-0 top-full mt-1 bg-white shadow-lg rounded-lg p-2 z-50 border whitespace-nowrap emoji-picker"
}: ReactionProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleReaction = (emoji: string) => {
    if (!socket) return

    // Server handles the toggle logic, so we just need to send the emoji
    socket.emit('add_reaction', {
      messageId,
      emoji,
      channelId
    })
    
    setShowEmojiPicker(false)
  }

  // Reaction grouping logic
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        count: 0,
        users: [],
        userIds: []
      }
    }
    acc[reaction.emoji].count++
    acc[reaction.emoji].users.push(reaction.user.name || 'Anonymous')
    acc[reaction.emoji].userIds.push(reaction.user.id)
    return acc
  }, {} as Record<string, { count: number, users: string[], userIds: string[] }>)

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation() // Prevent event bubbling
            setShowEmojiPicker(!showEmojiPicker)
          }}
          className={buttonClassName}
        >
          <Smile size={16} />
        </button>
        
        {showEmojiPicker && (
          <div 
            className={emojiPickerClassName}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            onMouseLeave={(e) => {
              const toElement = e.relatedTarget as HTMLElement
              if (!toElement?.closest('.emoji-picker')) {
                setShowEmojiPicker(false)
              }
            }}
          >
            <div className="flex gap-2">
              {["👍", "❤️", "😂", "😮", "😢", "👏"].map(emoji => (
                <div
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReaction(emoji)
                  }}
                  className="p-2 hover:bg-gray-100 rounded text-lg cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleReaction(emoji)
                    }
                  }}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Existing reactions display */}
      {Object.entries(groupedReactions).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => handleReaction(emoji)}
          className={`inline-flex items-center bg-gray-100 rounded-full px-2 py-0.5 text-sm hover:bg-gray-200 ${
            data.userIds.includes(currentUserId) ? 'border-2 border-blue-400' : ''
          }`}
          title={`${data.users.join(', ')} reacted with ${emoji}`}
        >
          <span>{emoji}</span>
          {data.count > 1 && <span className="ml-1 text-gray-600">{data.count}</span>}
        </button>
      ))}
    </div>
  )
} 