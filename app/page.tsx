import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { ChannelList } from "@/components/ChannelList"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"
import { LogoutButton } from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function Home() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session-token')?.value

    if (!token) {
      console.log('No token found, redirecting to signin')
      redirect('/signin')
    }

    // Get or create the general channel
    let generalChannel = await prisma.channel.findFirst({
      where: { name: 'general' }
    })

    if (!generalChannel) {
      generalChannel = await prisma.channel.create({
        data: {
          name: 'general',
          description: 'General discussion'
        }
      })
    }

    const initialMessages = await getMessages(generalChannel.id)

    return (
      <div className="flex h-screen">
        <div className="absolute top-4 right-4">
          <LogoutButton />
        </div>
        <aside className="w-64 bg-gray-800 text-white">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-xl font-bold">ChatGenius</h1>
          </div>
          <ChannelList />
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6">
            <h2 className="text-lg font-semibold"># general</h2>
          </header>

          <div className="flex-1 overflow-y-auto">
            <MessageList initialMessages={initialMessages} channelId={generalChannel.id} />
          </div>

          <MessageInput channelId={generalChannel.id} />
        </main>
      </div>
    )
  } catch (error) {
    console.error('Error in Home:', error)
    redirect('/signin')
  }
}

