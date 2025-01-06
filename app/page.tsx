import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { ChannelList } from "@/components/ChannelList"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"

export default async function Home() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('next-auth.session-token')

  if (!sessionToken) {
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
}

