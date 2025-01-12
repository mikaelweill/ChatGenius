import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"
import { ChatContainer } from "@/components/ChatContainer"
import { getServerUser } from "@/lib/auth"

interface ChannelPageProps {
  params: Promise<{ channelName: string }>
  searchParams: Promise<{ messageId?: string }>
}

export default async function ChannelPage({ params, searchParams }: ChannelPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { channelName } = resolvedParams;
  const messageId = resolvedSearchParams.messageId;

  const { user, error } = await getServerUser()
  
  if (error || !user) {
    redirect('/signin')
  }

  // Get the current channel
  const currentChannel = await prisma.channel.findFirst({
    where: { name: channelName }
  })
  if (!currentChannel) {
    redirect('/channels/general')
  }

  // Get messages using MessageListServer
  const initialMessages = await getMessages(currentChannel.id, false)

  return (
    <div className="relative h-full">
      <header className="absolute top-0 left-0 right-0 h-16 flex items-center px-6 bg-white">
        <h2 className="text-lg font-semibold"># {channelName}</h2>
      </header>
      <div className="h-full pt-16">
        <ChatContainer 
          initialMessages={initialMessages}
          channelId={currentChannel.id}
          currentUserId={user.id}
          messageIdToScrollTo={messageId}
        />
      </div>
    </div>
  )
} 