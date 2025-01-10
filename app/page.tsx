import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { ChannelSwitcher } from "@/components/ChannelSwitcher"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { getMessages } from "@/components/MessageListServer"
import { LogoutButton } from '@/components/LogoutButton'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

function decodeToken(token: string) {
  const payload = token.split('.')[1]
  const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8')
  return JSON.parse(decodedPayload)
}

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ channel?: string }>
}) {
  const resolvedParams = await searchParams;
  const { channel } = resolvedParams;
  
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Get authenticated user instead of session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('🔑 Auth Check:', {
      hasUser: !!user,
      userId: user?.id,
      error: userError?.message,
      cookieCount: cookieStore.getAll().filter(c => c.name.startsWith('sb-')).length
    })

    if (!user || userError) {
      console.log('❌ No authenticated user, redirecting')
      redirect('/signin')
    }

    // Add error boundary around Prisma operations
    try {
      let currentUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      if (!currentUser) {
        console.log('⚠️ User not found in Prisma:', user.id)
        redirect('/signin')
      }

      console.log('✅ User found:', {
        id: currentUser.id,
        email: currentUser.email,
        status: currentUser.status
      })

      // Get all channels
      const channels = await prisma.channel.findMany({
        orderBy: { createdAt: 'asc' }
      })

      // At the top of the page component
      console.log('Page render - fetching DMs with status')
      const directChats = await prisma.directChat.findMany({
        where: {
          participants: {
            some: {
              id: currentUser.id
            }
          }
        },
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      console.log('Fetched DMs:', directChats.map(chat => ({
        user: chat.participants[1]?.name,
        status: chat.participants[1]?.status
      })))

      // Map DMs to include other participant's info
      const dms = directChats.map(chat => ({
        ...chat,
        otherUser: chat.participants.find(p => p.id !== currentUser.id)
      }))

      // Get current channel from URL or fallback to general
      const currentChannel = channel 
        ? channels.find(c => c.id === channel)
        : channels.find(c => c.name === 'general') || channels[0]

      if (!currentChannel) {
        redirect('/error')
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
              directChats={dms}
              currentUserId={currentUser.id}
              currentChannelId={currentChannel?.id}
            />
          </aside>

          <main className="flex-1 flex flex-col">
            <header className="h-16 border-b flex items-center px-6">
              <h2 className="text-lg font-semibold"># {currentChannel.name}</h2>
            </header>

            <div className="flex-1 overflow-y-auto">
              <MessageList 
                initialMessages={initialMessages} 
                channelId={currentChannel.id} 
                currentUserId={currentUser.id}
              />
            </div>

            <MessageInput channelId={currentChannel.id} />
          </main>
        </div>
      )
    } catch (dbError) {
      console.error('💥 Database error:', dbError)
      throw dbError
    }
  } catch (error) {
    console.error('💥 Home page error:', error)
    redirect('/signin')
  }
}


