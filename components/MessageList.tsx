'use client'

import { useEffect, useState, useRef, useContext } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Message, Reaction } from '@prisma/client'
import { Username } from './Username'
import { SessionContext } from '@/components/SessionProvider'
import { Smile } from 'lucide-react'

type MessageWithAuthorAndReactions = Message & {
  author: {
    name: string | null;
    id: string;
    email: string | null;
    status: string;
  }
  reactions: (Reaction & {
    user: {
      id: string;
      name: string | null;
    }
  })[]
}

interface MessageListProps {
  initialMessages: MessageWithAuthorAndReactions[]
  channelId: string
  currentUserId: string
  isDM?: boolean
}

export function MessageList({ initialMessages, channelId, currentUserId }: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithAuthorAndReactions[]>(initialMessages)
  const { socket, isConnected } = useSocket({ channelId })
  const containerRef = useRef<HTMLDivElement>(null)
  const session = useContext(SessionContext)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)

  const isNearBottom = () => {
    const container = containerRef.current
    if (!container) return false
    
    const threshold = 100 // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }

  // Scroll whenever messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!socket) return

    socket.on('message_received', (message: MessageWithAuthorAndReactions) => {
      const wasAtBottom = isNearBottom()
      setMessages(prev => {
        const newMessages = [...prev, message]
        // Only scroll if we were at the bottom
        if (wasAtBottom) {
          // Force a scroll in the next tick
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight
            }
          }, 0)
        }
        return newMessages
      })
    })

    return () => {
      socket.off('message_received')
    }
  }, [socket])

  useEffect(() => {
    if (!socket) return

    socket.on('reaction_added', ({ messageId, reaction }) => {
      setMessages(prev => prev.map(message => {
        if (message.id === messageId) {
          return {
            ...message,
            reactions: [...(message.reactions || []), reaction]
          }
        }
        return message
      }))
    })

    socket.on('reaction_removed', ({ messageId, reactionId }) => {
      setMessages(prev => prev.map(message => {
        if (message.id === messageId) {
          return {
            ...message,
            reactions: (message.reactions || []).filter(r => r.id !== reactionId)
          }
        }
        return message
      }))
    })

    return () => {
      socket.off('reaction_added')
      socket.off('reaction_removed')
    }
  }, [socket])

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socket) return
    
    socket.emit('add_reaction', {
      messageId,
      emoji,
      channelId
    })
    setShowEmojiPicker(null)
  }

  return (
    <div key={channelId} className="space-y-4 p-4">
      {messages.map((message) => (
        <div key={message.id} className="flex items-start gap-3 group hover:bg-gray-100 p-2 rounded-lg transition-colors">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-medium shadow-sm">
              {message.author.name?.[0].toUpperCase() || 'A'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Username 
                userId={message.authorId}
                name={message.author.name}
                status={message.author.status}
              />
              <span className="text-xs text-gray-500 group-hover:opacity-100 opacity-0 transition-opacity">
                {new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            <p className="text-gray-700 break-words">{message.content}</p>
            
            <div className="flex flex-wrap gap-2 mt-2 relative">
              {Object.entries(
                (message.reactions || []).reduce((acc, reaction) => {
                  // Group reactions by emoji
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
              ).map(([emoji, data]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(message.id, emoji)}
                  className={`bg-gray-100 rounded-full px-2 py-1 text-sm hover:bg-gray-200 ${
                    data.userIds.includes(currentUserId) ? 'border-2 border-blue-400' : ''
                  }`}
                  title={`${data.users.join(', ')} reacted with ${emoji}`}
                >
                  {emoji} {data.count > 1 && data.count}
                </button>
              ))}
              
              <div className="relative inline-block">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEmojiPicker(message.id)
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full"
                >
                  <Smile size={16} />
                </button>
                {showEmojiPicker === message.id && (
                  <div 
                    className="absolute left-0 top-6 bg-white shadow-lg rounded-lg p-3 z-50 border whitespace-nowrap emoji-picker"
                    onMouseLeave={(e) => {
                      const toElement = e.relatedTarget as HTMLElement
                      if (!toElement?.closest('.emoji-picker')) {
                        setShowEmojiPicker(null)
                      }
                    }}
                  >
                    <div className="flex gap-2 px-1">
                      {["👍", "❤️", "😂", "😮", "😢", "👏"].map(emoji => (
                        <div
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReaction(message.id, emoji)
                          }}
                          className="p-2 hover:bg-gray-100 rounded text-lg cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleReaction(message.id, emoji)
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
            </div>
          </div>
        </div>
      ))}
      {!isConnected && (
        <div className="sticky bottom-0 text-center p-2 bg-red-50 rounded-lg border border-red-200">
          <span className="text-red-600 font-medium">
            Disconnected - trying to reconnect...
          </span>
        </div>
      )}
    </div>
  )
}

