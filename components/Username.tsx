'use client'

import Link from 'next/link'
import { TokenManager } from '@/lib/tokenManager'

interface UsernameProps {
  userId: string
  name: string | null
  // Remove currentUserId prop
}

export function Username({ userId, name }: UsernameProps) {
  const currentUserId = TokenManager.getUserId()  // Get userId directly

  if (userId === currentUserId) {
    return <span className="text-gray-700">{name}</span>
  }

  return (
    <Link
      href={`/channels/dm/${userId}`}
      className="text-blue-600 hover:underline"
    >
      {name}
    </Link>
  )
} 