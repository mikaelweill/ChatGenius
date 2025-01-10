import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

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
  const initialMessages = await prisma.message.findMany({
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
        where: {
          parentId: { not: null }
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  return {
    user,
    currentChannel,
    initialMessages
  }
} 