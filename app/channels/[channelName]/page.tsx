import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { LogoutButton } from '@/components/LogoutButton'
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"
import { ChannelSwitcher } from "@/components/ChannelSwitcher"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

interface ChannelPageProps {
  params: Promise<{ channelName: string }>
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/signin')
  }

  const userId = user.id

  const resolvedParams = await params;
  const { channelName } = resolvedParams;

  try {
    // Get all channels
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Get the current channel
    const currentChannel = channels.find(c => c.name === channelName)
    if (!currentChannel) {
      redirect('/channels/general')
    }

    // Get all DMs for current user using socket userId
    const directChats = await prisma.directChat.findMany({
      where: {
        participants: {
          some: {
            id: userId
          }
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Map DMs with socket userId
    const dms = directChats.map(chat => ({
      ...chat,
      otherUser: chat.participants.find(p => p.id !== userId)
    }))

    const initialMessages = await getMessages(currentChannel.id)

    return (
      <div className="flex h-screen">
        <div className="absolute top-4 right-4">
          <LogoutButton />
        </div>
        <aside className="w-64 bg-gray-800 text-white">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-xl font-bold">ChatGenius</h1>
          </div>
          <ChannelSwitcher 
            channels={channels}
            directChats={dms}
            currentChannelId={currentChannel.id}
            currentUserId={userId}
          />
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6">
            <h2 className="text-lg font-semibold"># {currentChannel.name}</h2>
          </header>

          <div className="flex-1 overflow-y-auto">
            <MessageList initialMessages={initialMessages} channelId={currentChannel.id} />
          </div>

          <MessageInput channelId={currentChannel.id} />
        </main>
      </div>
    )
  } catch (error) {
    console.error('Error in ChannelPage:', error)
    redirect('/error')
  }
} 