'use client'

import { prisma } from "@/lib/prisma"

type MessageListProps = {
  channelId: string
}

export async function MessageList({ channelId }: MessageListProps) {
  const messages = await prisma.message.findMany({
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

  return (
    <div className="p-6 space-y-6">
      {messages.map((message) => (
        <div key={message.id} className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-full bg-gray-300"></div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="font-semibold">{message.author.name}</span>
              <span className="text-sm text-gray-500">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-gray-700">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

