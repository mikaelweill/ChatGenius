'use client'

import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { ThreadPanel } from "@/components/ThreadPanel"
import { useState } from "react"
import { Message, Reaction } from "@prisma/client"
import { MessageWithAuthorAndReactions } from '@/types/message'

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
    <div className="h-full relative">
      {headerContent}
      
      {/* Messages Container */}
      <div className={`absolute inset-0 bottom-[64px] ${openThreadMessage ? 'right-[400px]' : ''}`}>
        <div className="h-full overflow-y-auto">
          <MessageList 
            initialMessages={initialMessages} 
            channelId={channelId}
            currentUserId={currentUserId}
            messageIdToScrollTo={messageIdToScrollTo}
            onThreadOpen={handleThreadOpen}
          />
        </div>
      </div>

      {/* Fixed Input */}
      <div className={`absolute bottom-0 left-0 ${openThreadMessage ? 'right-[400px]' : 'right-0'} h-[64px] bg-white border-t`}>
        <MessageInput channelId={channelId} />
      </div>

      {/* Thread Panel */}
      {openThreadMessage && (
        <div className="absolute top-0 right-0 bottom-0 w-[400px] border-l bg-white">
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
  )
} 