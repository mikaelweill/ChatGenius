'use client'

import { X, Smile } from 'lucide-react'
import { Message, Reaction } from '@prisma/client'
import { useState, useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Username } from './Username'
import { MessageWithAuthorAndReactions } from '@/types/message'

interface ThreadPanelProps {
  isOpen: boolean
  onClose: () => void
  originalMessage: MessageWithAuthorAndReactions | null
  channelId: string
  currentUserId: string
}

export function ThreadPanel({ isOpen, onClose, originalMessage, channelId, currentUserId }: ThreadPanelProps) {
  const [message, setMessage] = useState<MessageWithAuthorAndReactions | null>(null)
  const [mainReplyContent, setMainReplyContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const { socket, isConnected } = useSocket({ channelId })
  
  // Update message when originalMessage changes
  useEffect(() => {
    if (originalMessage) {
      setMessage(originalMessage)
    }
  }, [originalMessage])

  // Listen for message updates
  useEffect(() => {
    if (!socket || !message) return

    const handleMessageUpdated = (updatedMessage: MessageWithAuthorAndReactions) => {
      if (updatedMessage.id === message.id) {
        console.log('Updating thread message:', updatedMessage)
        setMessage(updatedMessage)
      }
    }

    const handleReactionAdded = ({ messageId, reaction }: { messageId: string, reaction: Reaction & { user: { id: string, name: string | null } } }) => {
      console.log('Reaction added:', { messageId, reaction });
      console.log('Current message:', message);
      
      setMessage(prev => {
        if (!prev) {
          console.log('No previous message state');
          return prev;
        }
        
        // Check if it's the main message
        if (prev.id === messageId) {
          console.log('Updating main message reaction');
          return {
            ...prev,
            reactions: [...prev.reactions, reaction]
          }
        }
        
        // Check if it's a reply
        if (prev.replies) {
          console.log('Checking replies for reaction update');
          const updatedMessage = {
            ...prev,
            replies: prev.replies.map(reply => {
              if (reply.id === messageId) {
                console.log('Found matching reply:', reply.id);
                return { ...reply, reactions: [...(reply.reactions || []), reaction] }
              }
              return reply;
            })
          };
          console.log('Updated message:', updatedMessage);
          return updatedMessage;
        }
        
        console.log('No matching message or reply found');
        return prev;
      });
    }

    const handleReactionRemoved = ({ messageId, reactionId }: { messageId: string, reactionId: string }) => {
      setMessage(prev => {
        if (!prev) return prev;
        
        // Check if it's the main message
        if (prev.id === messageId) {
          return {
            ...prev,
            reactions: prev.reactions.filter(r => r.id !== reactionId)
          }
        }
        
        // Check if it's a reply
        if (prev.replies) {
          return {
            ...prev,
            replies: prev.replies.map(reply => 
              reply.id === messageId 
                ? { ...reply, reactions: (reply.reactions || []).filter(r => r.id !== reactionId) }
                : reply
            )
          }
        }
        
        return prev;
      });
    }

    socket.on('message_updated', handleMessageUpdated)
    socket.on('reaction_added', handleReactionAdded)
    socket.on('reaction_removed', handleReactionRemoved)

    return () => {
      socket.off('message_updated', handleMessageUpdated)
      socket.off('reaction_added', handleReactionAdded)
      socket.off('reaction_removed', handleReactionRemoved)
    }
  }, [socket, message?.id])

  if (!isOpen || !message) return null;

  const handleSubmitReply = async (content: string) => {
    if (!content.trim() || !socket) return

    try {
      socket.emit('new_message', {
        content,
        channelId,
        parentId: message.id,
        isDM: false
      })
      setMainReplyContent('')
    } catch (error) {
      console.error('Failed to send reply:', error)
    }
  }

  const handleMainReplySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmitReply(mainReplyContent)
    setMainReplyContent('')
  }

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socket) return
    socket.emit('add_reaction', {
      messageId,
      emoji,
      channelId
    })
    setShowEmojiPicker(null)
  }

  const renderReactions = (messageId: string, reactions: (Reaction & { user: { id: string, name: string | null } })[]) => {
    const reactionCounts: { [key: string]: { count: number, users: string[] } } = {}
    reactions.forEach(reaction => {
      if (!reactionCounts[reaction.emoji]) {
        reactionCounts[reaction.emoji] = { count: 0, users: [] }
      }
      reactionCounts[reaction.emoji].count++
      reactionCounts[reaction.emoji].users.push(reaction.user.name || 'Anonymous')
    })

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {Object.entries(reactionCounts).map(([emoji, { count, users }]) => (
          <button
            key={emoji}
            onClick={() => handleReaction(messageId, emoji)}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
            title={users.join(', ')}
          >
            {emoji} <span className="text-gray-600">{count}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
        <h2 className="text-lg font-semibold">Thread</h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Original Message */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-medium">
            {message.author.name?.[0].toUpperCase() || 'A'}
          </div>
          <div>
            <Username 
              userId={message.author.id}
              name={message.author.name}
              status={message.author.status}
            />
            <div className="text-xs text-gray-500">
              {new Date(message.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
        <p className="text-gray-700">{message.content}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(message.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full"
            >
              <Smile size={16} />
            </button>
            {showEmojiPicker === message.id && (
              <div 
                className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-lg p-2 z-50 border whitespace-nowrap emoji-picker"
                onMouseLeave={(e) => {
                  const toElement = e.relatedTarget as HTMLElement
                  if (!toElement?.closest('.emoji-picker')) {
                    setShowEmojiPicker(null)
                  }
                }}
              >
                <div className="flex gap-2">
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
          {renderReactions(message.id, message.reactions)}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Replies */}
        <div className="p-4 pb-32">
          {message.replies?.map((reply) => (
            <div key={reply.id} className="mb-4 flex items-start gap-2">
              <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-medium">
                {reply.author.name?.[0].toUpperCase() || 'A'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Username 
                    userId={reply.author.id}
                    name={reply.author.name}
                    status={reply.author.status}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(reply.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700">{reply.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(reply.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full"
                    >
                      <Smile size={16} />
                    </button>
                    {showEmojiPicker === reply.id && (
                      <div 
                        className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-lg p-2 z-50 border whitespace-nowrap emoji-picker"
                        onMouseLeave={(e) => {
                          const toElement = e.relatedTarget as HTMLElement
                          if (!toElement?.closest('.emoji-picker')) {
                            setShowEmojiPicker(null)
                          }
                        }}
                      >
                        <div className="flex gap-2">
                          {["👍", "❤️", "😂", "😮", "😢", "👏"].map(emoji => (
                            <div
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReaction(reply.id, emoji)
                              }}
                              className="p-2 hover:bg-gray-100 rounded text-lg cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  handleReaction(reply.id, emoji)
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
                  {renderReactions(reply.id, reply.reactions || [])}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply Composer - Fixed at bottom */}
      <div className="sticky bottom-0 left-0 right-0 border-t bg-white">
        <div className="px-4 py-3">
          <div className="text-sm text-gray-500 mb-2">Reply to thread</div>
          <form onSubmit={handleMainReplySubmit}>
            <div className="flex gap-2">
              <input
                type="text"
                value={mainReplyContent}
                onChange={(e) => setMainReplyContent(e.target.value)}
                placeholder="Reply to thread..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!isConnected}
              />
              <button
                type="submit"
                disabled={!isConnected || !mainReplyContent.trim()}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 