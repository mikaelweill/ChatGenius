import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { ChannelSwitcher } from "@/components/ChannelSwitcher"
import { LogoutButton } from '@/components/LogoutButton'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import GlobalSearch from '@/components/GlobalSearch'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  const { data: { user }, error } = await supabase.auth.getUser()

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
          currentUserId={user.id}
        />
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center px-6 justify-between">
          <div className="w-1/3">
            <GlobalSearch />
          </div>
        </header>
        {children}
      </main>
    </div>
  )
} 