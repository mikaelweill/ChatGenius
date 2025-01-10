import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { getChannelData } from "./ChannelPageServer"

interface ChannelPageProps {
  params: Promise<{ channelName: string }>
  searchParams: Promise<{ messageId?: string }>
}

export default async function ChannelPage({ params, searchParams }: ChannelPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { channelName } = resolvedParams;
  const messageId = resolvedSearchParams.messageId;

  const { user, currentChannel, initialMessages } = await getChannelData(channelName)

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-hidden">
        <MessageList 
          initialMessages={initialMessages} 
          channelId={currentChannel.id}
          currentUserId={user.id}
          messageIdToScrollTo={messageId}
        />
      </div>
      <div className="sticky bottom-0 bg-white border-t">
        <MessageInput channelId={currentChannel.id} />
      </div>
    </div>
  )
} 