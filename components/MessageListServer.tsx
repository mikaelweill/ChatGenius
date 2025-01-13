import { prisma } from "@/lib/prisma"
import { Message, Reaction } from "@prisma/client"
import { MessageWithAuthorAndReactions } from '@/types/message'

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
      attachments: true,
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