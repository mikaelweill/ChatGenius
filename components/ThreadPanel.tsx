'use client'

import { X } from 'lucide-react'
import { Message, Reaction } from '@prisma/client'
import { useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Username } from './Username'

type MessageWithAuthorAndReactions = {
  id: string
  createdAt: Date
  updatedAt: Date
  content: string
  authorId: string
  channelId: string | null
  directChatId: string | null
  parentId: string | null
  author: {
    id: string
    name: string | null
    email: string | null
    status: string
  }
  reactions: (Reaction & {
    user: {
      id: string
      name: string | null
    }
  })[]
  replies: (Message & {
    author: {
      id: string
      name: string | null
      status: string
    }
  })[]
}

interface ThreadPanelProps {
  isOpen: boolean
  onClose: () => void
  originalMessage: MessageWithAuthorAndReactions | null
  channelId: string
  currentUserId: string
}

function ReplyComposer({ 
  onSubmit, 
  isConnected, 
  replyToId 
}: { 
  onSubmit: (content: string) => void
  isConnected: boolean
  replyToId: string 
}) {
  const [content, setContent] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    onSubmit(content)
    setContent('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Reply in thread..."
        className="flex-1 px-3 py-1 text-sm border rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        disabled={!isConnected}
      />
      <button
        type="submit"
        disabled={!isConnected || !content.trim()}
        className="px-3 py-1 text-sm bg-indigo-500 text-white rounded-full font-medium hover:bg-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Reply
      </button>
    </form>
  )
}

export function ThreadPanel({ isOpen, onClose, originalMessage, channelId, currentUserId }: ThreadPanelProps) {
  const [mainReplyContent, setMainReplyContent] = useState('')
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const { socket, isConnected } = useSocket({ channelId })
  
  if (!isOpen || !originalMessage) return null;

  const handleSubmitReply = async (content: string, parentId = originalMessage.id) => {
    if (!content.trim() || !socket) return

    try {
      socket.emit('new_message', {
        content,
        channelId,
        parentId,
        authorId: currentUserId,
        author: {
          id: currentUserId,
          name: originalMessage.author.name,
          status: originalMessage.author.status
        }
      })
      setActiveReplyId(null)
    } catch (error) {
      console.error('Failed to send reply:', error)
    }
  }

  const handleMainReplySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmitReply(mainReplyContent)
    setMainReplyContent('')
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Thread</h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Original Message */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-medium">
            {originalMessage.author.name?.[0].toUpperCase() || 'A'}
          </div>
          <div>
            <Username 
              userId={originalMessage.author.id}
              name={originalMessage.author.name}
              status={originalMessage.author.status}
            />
            <div className="text-xs text-gray-500">
              {new Date(originalMessage.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
        <p className="text-gray-700">{originalMessage.content}</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Replies */}
        <div className="flex-1 overflow-y-auto p-4">
          {originalMessage.replies?.map((reply) => (
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
                <button
                  onClick={() => setActiveReplyId(reply.id)}
                  className="text-xs text-indigo-500 hover:text-indigo-600 mt-1"
                >
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Composer - Outside scroll area */}
        {activeReplyId && (
          <div className="bg-white shadow-lg border-t border-b">
            <div className="px-4 py-3">
              <div className="text-xs text-gray-500 mb-2">Reply to message</div>
              <ReplyComposer
                onSubmit={(content) => handleSubmitReply(content, activeReplyId)}
                isConnected={isConnected}
                replyToId={activeReplyId}
              />
            </div>
          </div>
        )}

        {/* Main Reply Input */}
        <div className="bg-white border-t mt-auto">
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
    </div>
  )
} 