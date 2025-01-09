'use client'

import { useRouter } from 'next/navigation'
import { cleanupSocket } from '@/hooks/useSocket'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    try {
      // Clean up socket connection before logging out
      cleanupSocket()
      
      // Use Supabase signOut
      await supabase.auth.signOut()
      
      // Call our API to update user status
      await fetch('/api/auth/logout', { method: 'POST' })
      
      router.push('/signin')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
    >
      Logout
    </button>
  )
} 