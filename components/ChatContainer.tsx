'use client'

import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { ThreadPanel } from "@/components/ThreadPanel"
import { useState } from "react"
import { Message, Reaction } from "@prisma/client"

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

interface ChatContainerProps {
  initialMessages: MessageWithAuthorAndReactions[]
  channelId: string
  currentUserId: string
  messageIdToScrollTo?: string
  headerContent?: React.ReactNode
}

export function ChatContainer({ 
  initialMessages, 
  channelId, 
  currentUserId, 
  messageIdToScrollTo,
  headerContent
}: ChatContainerProps) {
  const [openThreadMessage, setOpenThreadMessage] = useState<MessageWithAuthorAndReactions | null>(null)

  const handleThreadOpen = (message: MessageWithAuthorAndReactions) => {
    console.log('handleThreadOpen called with message:', message);
    setOpenThreadMessage(message);
  };

  return (
    <>
      {headerContent}
      
      <div className="flex flex-1">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <MessageList 
              initialMessages={initialMessages} 
              channelId={channelId}
              currentUserId={currentUserId}
              messageIdToScrollTo={messageIdToScrollTo}
              onThreadOpen={handleThreadOpen}
            />
          </div>
          <div className="sticky bottom-0 z-10 bg-white border-t">
            <MessageInput channelId={channelId} />
          </div>
        </div>

        {openThreadMessage && (
          <div className="w-[400px] border-l bg-white flex-shrink-0">
            <ThreadPanel 
              isOpen={true}
              onClose={() => setOpenThreadMessage(null)}
              originalMessage={openThreadMessage}
              channelId={channelId}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>
    </>
  )
} 