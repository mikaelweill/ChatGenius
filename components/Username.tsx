'use client'

import { useRouter } from 'next/navigation'
import { useDMSocket } from '@/hooks/useSocket'

export function Username({ 
  userId, 
  name, 
  currentUserId 
}: { 
  userId: string
  name: string
  currentUserId: string 
}) {
  const router = useRouter()
  const { createDM } = useDMSocket()

  const handleClick = () => {
    if (userId === currentUserId) return

    createDM(userId, (chatId) => {
      router.push(`/?dm=${chatId}`)
    })
  }

  return (
    <span 
      onClick={handleClick}
      className="cursor-pointer hover:underline text-blue-600"
    >
      {name}
    </span>
  )
} 