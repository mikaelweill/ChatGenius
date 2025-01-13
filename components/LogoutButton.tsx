'use client'

import { useRouter } from 'next/navigation'
import { TokenManager } from '@/lib/tokenManager'
import { useSocket } from '@/hooks/useSocket'

interface Props {
  userId: string
}

export function LogoutButton({ userId }: Props) {
  const router = useRouter()
  const { socket } = useSocket()
  
  const handleLogout = async () => {
    try {
      // Emit offline status before logging out
      if (socket && userId) {
        socket.emit('status', {
          userId,
          status: 'offline',
          updatedAt: new Date()
        })
        
        // Give the socket a moment to emit the status
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Call logout API endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Logout failed')
      }

      // Clear token and userId
      TokenManager.removeToken()
      TokenManager.removeUserId()
      
      // Force a router refresh to ensure all server components re-render
      router.refresh()
      router.push('/signin')
    } catch (error) {
      console.error('Failed to logout:', error)
      // Still redirect to signin even if logout fails
      router.push('/signin')
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    >
      Log out
    </button>
  )
}