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
  params: { userId: string } 
}) {
  try {
    // Get all channels for the sidebar
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Get both users
    const otherUser = await prisma.user.findUnique({
      where: { id: params.userId }
    })

    if (!otherUser) {
      redirect('/channels/general')
    }

    // Find or create DM chat
    let dmChat = await prisma.directChat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: params.userId } } },
          { participants: { some: { id: params.userId } } }
        ]
      },
      include: {
        participants: true
      }
    })

    if (!dmChat) {
      // Create new DM chat
      dmChat = await prisma.directChat.create({
        data: {
          participants: {
            connect: [
              { id: params.userId }
            ]
          }
        },
        include: {
          participants: true
        }
      })
    }

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
            currentChannelId={dmChat.id}
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