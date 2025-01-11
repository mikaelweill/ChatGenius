import { Message, Reaction, Attachment } from '@prisma/client'

type ReplyMessage = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  authorId: string
  channelId: string | null
  directChatId: string | null
  parentId: string | null
  author: {
    id: string
    name: string | null
    status: string
  }
  reactions: (Reaction & {
    user: {
      id: string
      name: string | null
    }
  })[]
  attachments: Attachment[]
}

export type MessageWithAuthorAndReactions = {
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
  replies: ReplyMessage[]
  attachments: Attachment[]
} 