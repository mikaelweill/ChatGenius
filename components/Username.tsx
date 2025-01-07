'use client'

import Link from 'next/link'

export function Username({ 
  userId, 
  name, 
  currentUserId 
}: { 
  userId: string
  name: string
  currentUserId: string 
}) {
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