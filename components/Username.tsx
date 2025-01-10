'use client'

import Link from 'next/link'
import { TokenManager } from '@/lib/tokenManager'

interface UsernameProps {
  userId: string
  name: string | null
}

export function Username({ userId, name }: UsernameProps) {
  const currentUserId = TokenManager.getUserId()

  if (userId === currentUserId) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-gray-700">
        <span className="h-2 w-2 rounded-full bg-green-400"></span>
        {name}
        <span className="text-xs text-gray-500">(you)</span>
      </span>
    )
  }

  return (
    <Link
      href={`/channels/dm/${userId}`}
      className="group inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 transition-colors"
    >
      <span className="h-2 w-2 rounded-full bg-gray-400 group-hover:bg-blue-400 transition-colors"></span>
      {name}
      <span className="hidden group-hover:inline text-xs text-gray-500">(click to DM)</span>
    </Link>
  )
}