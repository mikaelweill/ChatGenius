export type DirectChatWithParticipants = {
  id: string
  createdAt: Date
  participants: {
    id: string
    name: string | null
    email: string | null
    status: string
  }[]
  otherUser?: {
    id: string
    name: string | null
    email: string | null
    status: string
  }
} 