import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/components/MessageListServer"
import { ChatContainer } from "@/components/ChatContainer"
import { getServerUser } from "@/lib/auth"

export default async function DMPage({ 
  params 
}: { 
  params: Promise<{ userId: string }> 
}) {
  const { userId: otherUserId } = await params
  
  const { user, error } = await getServerUser()
  
  if (error || !user) {
    redirect('/signin')
  }

  // Get other user
  const otherUser = await prisma.user.findFirst({
    where: { 
      AND: [
        { id: otherUserId },
        { isAI: false }
      ]
    }
  })

  if (!otherUser) {
    redirect('/channels/general')
  }

  // Find or create DM chat
  let dmChat = await prisma.directChat.findFirst({
    where: {
      AND: [
        { participants: { some: { id: user.id } } },
        { participants: { some: { 
          AND: [
            { id: otherUserId },
            { isAI: false }
          ]
        }}}
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
    <div className="relative h-full">
      <header className="absolute top-0 left-0 right-0 h-16 flex items-center px-6 bg-white border-b">
        <h2 className="text-lg font-semibold">@ {otherUser.name}</h2>
      </header>
      <div className="h-full pt-16">
        <ChatContainer 
          initialMessages={initialMessages}
          channelId={dmChat.id}
          currentUserId={user.id}
          isDM={true}
        />
      </div>
    </div>
  )
} 