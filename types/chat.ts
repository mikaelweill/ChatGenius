import { DirectChat, User } from '@prisma/client'

export interface DirectChatWithParticipants extends DirectChat {
  participants: {
    id: string
    name: string | null
    email: string | null
    status: string
    isAI?: boolean
  }[]
  otherUser?: {
    id: string
    name: string | null
    email: string | null
    status: string
    isAI?: boolean
  }
} 