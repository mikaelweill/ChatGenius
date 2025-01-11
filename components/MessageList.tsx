'use client'

import { useEffect, useState, useRef, useContext } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Message, Reaction } from '@prisma/client'
import { Username } from './Username'
import { SessionContext } from '@/components/SessionProvider'
import { Smile, MessageSquare } from 'lucide-react'
import { MessageWithAuthorAndReactions } from '@/types/message'
import { FileDropZone } from './FileDropZone'
import { eventBus } from '@/lib/eventBus'

interface MessageListProps {
  initialMessages: MessageWithAuthorAndReactions[]
  channelId: string
  currentUserId: string
  isDM?: boolean
  messageIdToScrollTo?: string
  onThreadOpen?: (message: MessageWithAuthorAndReactions) => void
}

export function MessageList({ initialMessages, channelId, currentUserId, isDM = false, messageIdToScrollTo, onThreadOpen }: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithAuthorAndReactions[]>(initialMessages)
  const { socket, isConnected } = useSocket({ channelId })
  const containerRef = useRef<HTMLDivElement>(null)
  const session = useContext(SessionContext)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const shouldAutoScroll = useRef(true)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)

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

  // Add scroll listener to update shouldAutoScroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      shouldAutoScroll.current = isNearBottom()
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Update message received handler
  useEffect(() => {
    const handleMessageReceived = (message: MessageWithAuthorAndReactions) => {
      console.log('Message received:', message);
      setMessages(prevMessages => {
        // If this is a reply, we don't add it to the main list
        if (message.parentId) return prevMessages;
        return [...prevMessages, message]
      })
      
      if (shouldAutoScroll.current) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
          }
        }, 100)
      }
    }

    const handleMessageUpdated = (updatedMessage: MessageWithAuthorAndReactions) => {
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === updatedMessage.id ? updatedMessage : msg
        )
      )
    }

    if (socket) {
      socket.on('message_received', handleMessageReceived)
      socket.on('message_updated', handleMessageUpdated)
    }

    return () => {
      if (socket) {
        socket.off('message_received', handleMessageReceived)
        socket.off('message_updated', handleMessageUpdated)
      }
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

  // Scroll to specific message if messageIdToScrollTo is provided
  useEffect(() => {
    if (messageIdToScrollTo && containerRef.current) {
      const messageElement = document.getElementById(`message-${messageIdToScrollTo}`)
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedMessageId(messageIdToScrollTo)
        // Remove highlight after 2 seconds
        setTimeout(() => setHighlightedMessageId(null), 2000)
      }
    }
  }, [messageIdToScrollTo]);

  const handleFileDrop = (file: File) => {
    eventBus.emitFileDrop(file);
  }

  return (
    <FileDropZone onFileDrop={handleFileDrop} className="flex-1">
      <div 
        ref={containerRef} 
        key={channelId} 
        className="flex flex-col space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-8rem)]"
      >
        {messages.map((message) => (
          <div 
            id={`message-${message.id}`}
            key={message.id} 
            className={`flex items-start gap-3 group p-2 rounded-lg transition-colors relative ${
              message.id === highlightedMessageId 
                ? 'bg-blue-50 hover:bg-blue-100' 
                : 'hover:bg-gray-100'
            }`}
          >
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
              
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center space-x-1.5">
                  <div className="relative">
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
                        className="absolute bg-white shadow-lg rounded-lg p-3 border whitespace-nowrap emoji-picker"
                        style={{ 
                          minWidth: '200px',
                          zIndex: 100,
                          top: '100%',
                          left: '0',
                        }}
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof onThreadOpen === 'function') {
                        onThreadOpen(message);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full flex items-center gap-1"
                  >
                    <MessageSquare size={16} />
                    {message.replies?.length > 0 && (
                      <span className="text-xs">{message.replies.length}</span>
                    )}
                  </button>

                  {Object.entries(
                    (message.reactions || []).reduce((acc, reaction) => {
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
    </FileDropZone>
  )
}

