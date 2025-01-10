import { prisma } from "@/lib/prisma"
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

  return messages
} 