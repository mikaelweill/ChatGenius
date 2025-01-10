import { useRouter } from 'next/navigation'
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

export function SearchResults({ messages }: { messages: MessageWithAuthorAndReactions[] }) {
  const router = useRouter()

  const handleMessageClick = (message: MessageWithAuthorAndReactions) => {
    // Navigate to the channel/DM first
    const path = message.isDM 
      ? `/dm/${message.channelId}` 
      : `/channels/${message.channelId}`
      
    // Use router.push with the messageId as a search param
    router.push(`${path}?messageId=${message.id}`)
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div 
          key={message.id}
          onClick={() => handleMessageClick(message)}
          className="cursor-pointer p-4 hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">{message.author.name}</span>
            <span className="text-gray-500 text-sm">
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-gray-700">{message.content}</p>
        </div>
      ))}
    </div>
  )
} 