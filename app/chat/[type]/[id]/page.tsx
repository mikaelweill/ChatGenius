import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { LogoutButton } from '@/components/LogoutButton'
import { ChannelSwitcher } from "@/components/ChannelSwitcher"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"

export const dynamic = 'force-dynamic'

export default async function ChatPage({
  params
}: {
  params: { type: 'channel' | 'dm'; id: string }
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value

  if (!token) {
    redirect('/signin')
  }

  try {
    // Get all channels for the sidebar
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Get current chat data based on type
    let currentChat
    let chatName
    let initialMessages

    if (params.type === 'channel') {
      currentChat = await prisma.channel.findUnique({
        where: { id: params.id }
      })
      
      if (!currentChat) {
        const generalChannel = channels.find(c => c.name === 'general')
        if (generalChannel) {
          redirect('/chat/channel/general')
        } else if (channels.length > 0) {
          redirect(`/chat/channel/${channels[0].id}`)
        } else {
          redirect('/error')
        }
      }

      chatName = `# ${currentChat.name}`
      initialMessages = await getMessages(params.id)
    } else {
      currentChat = await prisma.directChat.findUnique({
        where: { id: params.id },
        include: {
          participants: true
        }
      })

      if (!currentChat) {
        redirect('/chat/channel/general')
      }

      const otherUser = currentChat.participants[0] // We'll need to determine the correct user
      chatName = `@ ${otherUser.name}`
      initialMessages = await getMessages(params.id, true)
    }

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
            directChats={directChats}
            currentUserId={currentUser.id}
            currentChat={{
              type: params.type,
              id: params.id
            }}
          />
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6">
            <h2 className="text-lg font-semibold">{chatName}</h2>
          </header>

          <div className="flex-1 overflow-y-auto">
            <MessageList 
              initialMessages={initialMessages}
              chatId={params.id}
              isDM={params.type === 'dm'}
              currentUserId={currentUser.id}
            />
          </div>

          <MessageInput 
            chatId={params.id}
            isDM={params.type === 'dm'}
          />
        </main>
      </div>
    )
  } catch (error) {
    console.error('Error in ChatPage:', error)
    redirect('/signin')
  }
} 