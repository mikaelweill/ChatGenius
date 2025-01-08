import { prisma } from "@/lib/prisma"

export async function getMessages(chatId: string, isDM: boolean = false) {
  return await prisma.message.findMany({
    where: isDM 
      ? { directChatId: chatId }
      : { channelId: chatId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
} 