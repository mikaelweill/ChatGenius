import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { LogoutButton } from '@/components/LogoutButton'
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"
import { ChannelSwitcher } from "@/components/ChannelSwitcher"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"

export default async function ChannelPage({ 
  params 
}: { 
  params: { channelName: string } 
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value

  if (!token) {
    redirect('/signin')
  }

  try {
    // Get all channels first
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Get the current channel
    const currentChannel = channels.find(c => c.name === params.channelName)

    // If channel not found, redirect to general or first available channel
    if (!currentChannel) {
      const generalChannel = channels.find(c => c.name === 'general')
      if (generalChannel) {
        redirect('/channels/general')
      } else if (channels.length > 0) {
        redirect(`/channels/${channels[0].name}`)
      } else {
        redirect('/error')
      }
    }

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
            currentChannelId={currentChannel.id}
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