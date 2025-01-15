'use client'

import { useEffect, useState, useRef, useContext } from 'react'
import { useSocketRoom } from '@/hooks/useSocket'
import { Message, Reaction } from '@prisma/client'
import { Username } from './Username'
import { SessionContext } from '@/components/SessionProvider'
import { Smile, MessageSquare, Download } from 'lucide-react'
import { MessageWithAuthorAndReactions } from '@/types/message'
import { FileDropZone } from './FileDropZone'
import { eventBus } from '@/lib/eventBus'
import { VideoPlayer } from './VideoPlayer'

interface MessageListProps {
  initialMessages: MessageWithAuthorAndReactions[]
  channelId: string
  currentUserId: string
  isDM?: boolean
  messageIdToScrollTo?: string
  onThreadOpen?: (message: MessageWithAuthorAndReactions) => void
}

interface Attachment {
  id: string;
  url: string;
  name: string;
  type: string;
}

interface AttachmentWithUrl extends Attachment {
  presignedUrl?: string;
}

const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'audio/mpeg') return '🎵';
  if (fileType === 'application/pdf') return '📑';
  if (fileType === 'text/plain') return '📄';
  if (fileType.includes('word')) return '📝';
  return '📎'; // Default icon
};

const handleDownload = async (url: string, fileName: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
  }
};

export function MessageList({ initialMessages, channelId, currentUserId, isDM = false, messageIdToScrollTo, onThreadOpen }: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithAuthorAndReactions[]>(initialMessages)
  const { socket, isConnected, messages: socketMessages } = useSocketRoom({ channelId, isDM })
  const containerRef = useRef<HTMLDivElement>(null)
  const session = useContext(SessionContext)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const shouldAutoScroll = useRef(true)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})

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

  // Handle reactions
  useEffect(() => {
    if (!socket) return

    const handleReactionAdded = ({ messageId, reaction }: { messageId: string, reaction: Reaction & { user: { id: string, name: string | null } } }) => {
      setMessages(prev => prev.map(message => {
        if (message.id === messageId) {
          return {
            ...message,
            reactions: [...(message.reactions || []), reaction]
          }
        }
        return message
      }))
    }

    const handleReactionRemoved = ({ messageId, reactionId }: { messageId: string, reactionId: string }) => {
      setMessages(prev => prev.map(message => {
        if (message.id === messageId) {
          return {
            ...message,
            reactions: (message.reactions || []).filter(r => r.id !== reactionId)
          }
        }
        return message
      }))
    }

    socket.on('reaction_added', handleReactionAdded)
    socket.on('reaction_removed', handleReactionRemoved)

    return () => {
      socket.off('reaction_added', handleReactionAdded)
      socket.off('reaction_removed', handleReactionRemoved)
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

  // Update the effect to use fetch instead of getPresignedViewUrl
  useEffect(() => {
    messages.forEach(message => {
      message.attachments?.forEach(async (attachment) => {
        if (!attachmentUrls[attachment.id]) {
          try {
            const response = await fetch(`/api/presigned-url?fileKey=${encodeURIComponent(attachment.url)}`);
            const data = await response.json();
            if (data.url) {
              setAttachmentUrls(prev => ({
                ...prev,
                [attachment.id]: data.url
              }));
            }
          } catch (error) {
            console.error('Error getting presigned URL:', error);
          }
        }
      });
    });
  }, [messages, attachmentUrls]);

  return (
    <FileDropZone onFileDrop={handleFileDrop} className="h-full flex flex-col">
      <div 
        ref={containerRef} 
        key={channelId} 
        className="flex-1 flex flex-col space-y-4 p-4 overflow-y-auto min-h-0"
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
              
              {message.attachments?.map(attachment => (
                <div key={attachment.id} className="mt-2 max-w-sm">
                  {attachment.type.startsWith('image/') ? (
                    // Image attachments
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      {attachmentUrls[attachment.id] ? (
                        <img 
                          src={attachmentUrls[attachment.id]} 
                          alt={attachment.name}
                          className="max-w-full h-auto"
                        />
                      ) : (
                        <div className="h-32 flex items-center justify-center bg-gray-50">
                          <span className="text-gray-400">Loading image...</span>
                        </div>
                      )}
                    </div>
                  ) : attachment.type.startsWith('video/') ? (
                    // Video attachments
                    <VideoPlayer 
                      src={attachmentUrls[attachment.id] || ''} 
                      fileName={attachment.name}
                    />
                  ) : attachment.type.startsWith('audio/') ? (
                    // Audio attachments (both MP3 and WebM)
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-2xl">🎵</div>
                        <div className="text-sm font-medium text-gray-700 truncate">
                          {attachment.name}
                        </div>
                      </div>
                      {attachmentUrls[attachment.id] ? (
                        <audio 
                          controls 
                          className="w-full" 
                          preload="metadata"
                        >
                          <source src={attachmentUrls[attachment.id]} type={attachment.type} />
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <div className="h-10 flex items-center justify-center bg-gray-50">
                          <span className="text-gray-400">Loading audio...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Other file types
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <div className="text-2xl">{getFileIcon(attachment.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-700 truncate">
                          {attachment.name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{attachment.type}</span>
                        </div>
                      </div>
                      <a
                        href="#"
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full"
                        title="Download file"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (attachmentUrls[attachment.id]) {
                            handleDownload(attachmentUrls[attachment.id], attachment.name);
                          }
                        }}
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
              
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

