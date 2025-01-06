import { prisma } from "@/lib/prisma"

export async function getMessages(channelId: string) {
  return await prisma.message.findMany({
    where: {
      channelId,
    },
    include: {
      author: {
        select: {
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