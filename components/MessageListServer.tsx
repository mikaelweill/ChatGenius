import { prisma } from "@/lib/prisma"
import { Message, Reaction } from "@prisma/client"

type MessageWithAuthorAndReactions = Message & {
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
  replies: Message[]
}

export async function getMessages(chatId: string, isDM: boolean = false): Promise<MessageWithAuthorAndReactions[]> {
  const messages = await prisma.message.findMany({
    where: isDM 
      ? { directChatId: chatId, parentId: null }
      : { channelId: chatId, parentId: null },
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

  return messages
} 