'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/signin')
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