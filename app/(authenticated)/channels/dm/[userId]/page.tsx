import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import { getMessages } from "@/components/MessageListServer"
import { cookies } from "next/headers"
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export default async function DMPage({ 
  params 
}: { 
  params: Promise<{ userId: string }> 
}) {
  const { userId: otherUserId } = await params
  
const cookieStore = cookies()
const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }

  // Get other user
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
        { participants: { some: { id: user.id } } },
        { participants: { some: { id: otherUserId } } }
      ]
    },
    include: {
      participants: true
    }
  })

  if (!dmChat) {
    dmChat = await prisma.directChat.create({
      data: {
        participants: {
          connect: [
            { id: user.id },
            { id: otherUserId }
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
    <>
      <header className="h-16 border-b flex items-center px-6">
        <h2 className="text-lg font-semibold">@ {otherUser.name}</h2>
      </header>

      <div className="flex-1 overflow-y-auto">
        <MessageList 
          initialMessages={initialMessages} 
          channelId={dmChat.id}
          currentUserId={user.id}
          isDM={true}
        />
      </div>

      <MessageInput 
        channelId={dmChat.id}
        isDM={true}
      />
    </>
  )
} 