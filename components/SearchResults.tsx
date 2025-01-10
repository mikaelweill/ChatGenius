import { useRouter } from 'next/router'
import { Message, Reaction } from '@prisma/client'

type MessageWithAuthorAndReactions = Message & {
  author: {
    name: string | null;
    id: string;
    email: string | null;
    status: string;
  }
  reactions: (Reaction & {
    user: {
      id: string;
      name: string | null;
    }
  })[]
  isDM?: boolean
}

const handleMessageClick = (message: MessageWithAuthorAndReactions) => {
  const router = useRouter()
  
  // Navigate to the channel/DM first
  const path = message.isDM 
    ? `/dm/${message.channelId}` 
    : `/channels/${message.channelId}`
    
  // Use router.push with query parameter for the message ID
  router.push({
    pathname: path,
    query: { messageId: message.id }
  })
} 