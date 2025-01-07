'use client'

import { useRouter } from 'next/navigation'

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

  const handleClick = () => {
    if (userId === currentUserId) return
    router.push(`/channels/dm/${userId}`)
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