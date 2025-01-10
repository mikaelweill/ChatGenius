import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Message, Reaction } from "@prisma/client"

type MessageWithAuthorAndReactions = {
  id: string
  createdAt: Date
  updatedAt: Date
  content: string
  authorId: string
  channelId: string | null
  directChatId: string | null
  parentId: string | null
  author: {
    id: string
    name: string | null
    email: string | null
    status: string
  }
  reactions: (Reaction & {
    user: {
      id: string
      name: string | null
    }
  })[]
  replies: (Message & {
    author: {
      id: string
      name: string | null
      status: string
    }
  })[]
}

export async function getChannelData(channelName: string) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore 
  })
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }

  // Get the current channel
  const currentChannel = await prisma.channel.findFirst({
    where: { name: channelName }
  })

  if (!currentChannel) {
    redirect('/channels/general')
  }

  // Get messages for this channel
  const messages = await prisma.message.findMany({
    where: {
      channelId: currentChannel.id,
      parentId: null // Only get top-level messages
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true
        }
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      replies: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  }) as MessageWithAuthorAndReactions[]

  return {
    user,
    currentChannel,
    initialMessages: messages
  }
} 