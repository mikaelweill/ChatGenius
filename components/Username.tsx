'use client'

import Link from 'next/link'
import { TokenManager } from '@/lib/tokenManager'
import { useUserStatus } from '@/contexts/UserStatusContext'

interface UsernameProps {
  userId: string
  name: string | null
  status: string
}

export function Username({ userId, name, status }: UsernameProps) {
  const currentUserId = TokenManager.getUserId()
  const { statuses } = useUserStatus()
  const userStatus = statuses[userId] || status || 'offline'

  if (userId === currentUserId) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-gray-700">
        <span className={`h-2 w-2 rounded-full ${userStatus === 'online' ? 'bg-green-500' : 'bg-gray-300'} ring-2 ring-white`}></span>
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
      <span className={`h-2 w-2 rounded-full ${userStatus === 'online' ? 'bg-green-500' : 'bg-gray-300'} ring-2 ring-white`}></span>
      {name}
      <span className="hidden group-hover:inline text-xs text-gray-500">(click to DM)</span>
    </Link>
  )
}