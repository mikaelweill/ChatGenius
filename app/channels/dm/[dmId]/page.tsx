import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { LogoutButton } from '@/components/LogoutButton'
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"
import { ChannelSwitcher } from "@/components/ChannelSwitcher"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"

export default async function DMPage({ 
  params 
}: { 
  params: { dmId: string } 
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value

  if (!token) {
    redirect('/signin')
  }

  try {
    // Get current user
    const currentUser = await prisma.user.findFirst({
      where: {
        sessions: {
          some: {
            token
          }
        }
      }
    })

    if (!currentUser) {
      redirect('/signin')
    }

    // Get all channels for the sidebar
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Get the current DM chat and other user
    const currentDM = await prisma.directChat.findUnique({
      where: { id: params.dmId },
      include: {
        participants: true
      }
    })

    if (!currentDM) {
      redirect('/channels/general')
    }

    // Find the other participant
    const otherUser = currentDM.participants.find(p => p.id !== currentUser.id)
    if (!otherUser) {
      redirect('/channels/general')
    }

    const initialMessages = await getMessages(params.dmId, true)

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
            currentChannelId={params.dmId}
          />
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6">
            <h2 className="text-lg font-semibold">@ {otherUser.name}</h2>
          </header>

          <div className="flex-1 overflow-y-auto">
            <MessageList 
              initialMessages={initialMessages} 
              channelId={params.dmId}
              currentUserId={currentUser.id}
            />
          </div>

          <MessageInput 
            channelId={params.dmId}
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