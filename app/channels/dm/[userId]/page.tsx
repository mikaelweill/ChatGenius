import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { LogoutButton } from '@/components/LogoutButton'
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"
import { ChannelSwitcher } from "@/components/ChannelSwitcher"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"

function decodeToken(token: string) {
  const payload = token.split('.')[1]
  const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8')
  return JSON.parse(decodedPayload)
}

interface DMPageProps {
  params: Promise<{ userId: string }>
}

export default async function DMPage({ params }: DMPageProps) {
  const resolvedParams = await params;
  const { userId: otherUserId } = resolvedParams;
  
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      redirect('/signin')
    }

    const currentUserId = user.id

    // Get both users
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId }
    })

    if (!otherUser) {
      redirect('/channels/general')
    }

    // Find or create DM chat
    let dmChat = await prisma.directChat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: currentUserId } } },
          { participants: { some: { id: otherUserId } } }
        ]
      },
      include: {
        participants: true
      }
    })

    if (!dmChat) {
      // Create new DM chat with both users
      dmChat = await prisma.directChat.create({
        data: {
          participants: {
            connect: [
              { id: currentUserId },
              { id: otherUserId }
            ]
          }
        },
        include: {
          participants: true
        }
      })
    }

    // Get all channels for the sidebar
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Get all DMs for current user
    const directChats = await prisma.directChat.findMany({
      where: {
        participants: {
          some: {
            id: currentUserId
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

    // Map DMs to include other participant's info
    const dms = directChats.map(chat => ({
      ...chat,
      otherUser: chat.participants.find(p => p.id !== currentUserId)
    }))

    const initialMessages = await getMessages(dmChat.id, true)

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
            currentChannelId={dmChat.id}
            currentUserId={currentUserId}
          />
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6">
            <h2 className="text-lg font-semibold">@ {otherUser.name}</h2>
          </header>

          <div className="flex-1 overflow-y-auto">
            <MessageList 
              initialMessages={initialMessages} 
              channelId={dmChat.id}
              currentUserId={currentUserId}
              isDM={true}
            />
          </div>

          <MessageInput 
            channelId={dmChat.id}
            isDM={true}
          />
        </main>
      </div>
    )
  } catch (error) {
    console.error('Error in DMPage:', error)
    redirect('/error')
  }
} 