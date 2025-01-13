'use client'

import { createContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Session } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { sharedSocket, cleanupSocket } from '@/hooks/useSocket'

export const SessionContext = createContext<Session | null>(null)

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Clean up any existing socket before setting new session
        if (sharedSocket) {
          console.log('🔌 Cleaning up existing socket connection')
          cleanupSocket()
          console.log('🔌 Socket connection cleaned up')
        }
      }
      setSession(session)
      if (!session) {
        router.push('/signin')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
} 