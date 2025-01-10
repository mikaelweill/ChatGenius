import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { getMessages } from "@/components/MessageListServer"
import { cookies } from "next/headers"
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

interface ChannelPageProps {
  params: Promise<{ channelName: string }>
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const resolvedParams = await params;
  const { channelName } = resolvedParams;
  
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore 
  })
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }

  // Get the current channel
  const currentChannel = await prisma.channel.findFirst({
    where: { name: channelName }
  })

  if (!currentChannel) {
    redirect('/channels/general')
  }

  // Get messages for this channel
  const initialMessages = await prisma.message.findMany({
    where: {
      channelId: currentChannel.id
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true
        }
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  return (
    <>
      <header className="h-16 border-b flex items-center px-6">
        <h2 className="text-lg font-semibold"># {currentChannel.name}</h2>
      </header>

      <div className="flex-1 overflow-y-auto">
        <MessageList 
          initialMessages={initialMessages} 
          channelId={currentChannel.id}
          currentUserId={user.id}
        />
      </div>

      <MessageInput channelId={currentChannel.id} />
    </>
  )
} 