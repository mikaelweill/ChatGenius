import { prisma } from "@/lib/prisma"

export async function getMessages(channelId: string) {
  const messages = await prisma.message.findMany({
    where: { 
      channelId
    },
    orderBy: { 
      createdAt: 'asc' 
    },
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })
  return messages
} 