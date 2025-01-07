import { prisma } from "@/lib/prisma"

export async function getMessages(chatId: string, isDM: boolean = false) {
  return await prisma.message.findMany({
    where: isDM 
      ? { directChatId: chatId }  // For DM messages
      : { channelId: chatId },    // For channel messages
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