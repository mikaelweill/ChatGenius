import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { ChannelSwitcher } from "@/components/ChannelSwitcher"
import { LogoutButton } from '@/components/LogoutButton'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import GlobalSearch from '@/components/GlobalSearch'
import { headers } from 'next/headers'
import { MessageInput } from '@/components/MessageInput'

// Create a singleton for auth to avoid multiple cookie accesses
async function getAuthUser() {
  // Only get cookies once and reuse
  const cookieStore = cookies()
  const headersList = headers()
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore,
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getAuthUser()

  if (error || !user) {
    redirect('/signin')
  }

  // Fetch common data needed across all authenticated pages
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const directChats = await prisma.directChat.findMany({
    where: {
      participants: {
        some: { id: user.id }
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
    }
  })

  const dms = directChats.map(chat => ({
    ...chat,
    otherUser: chat.participants.find(p => p.id !== user.id)
  }))

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">ChatGenius</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChannelSwitcher 
            channels={channels}
            directChats={dms}
            currentUserId={user.id}
          />
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1">
            <GlobalSearch userId={user.id} />
          </div>
          <div className="ml-auto">
            <LogoutButton userId={user.id} />
          </div>
        </header>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
} 