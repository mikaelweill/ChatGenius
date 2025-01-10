import { getChannelData } from "./ChannelPageServer"
import { ChatContainer } from "@/components/ChatContainer"

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

  const header = (
    <header className="h-16 border-b flex items-center px-6">
      <h2 className="text-lg font-semibold"># {channelName}</h2>
    </header>
  );

  return (
    <ChatContainer 
      initialMessages={initialMessages}
      channelId={currentChannel.id}
      currentUserId={user.id}
      messageIdToScrollTo={messageId}
      headerContent={header}
    />
  )
} 