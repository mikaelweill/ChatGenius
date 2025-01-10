'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, usePathname } from 'next/navigation'

export function ActivityTracker() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let isRedirecting = false

    const pingActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        // Skip activity tracking for signin page
        if (pathname === '/signin') {
          return
        }

        // Only redirect if we haven't started redirecting yet and we're not on signin page
        if (!user && !isRedirecting && pathname !== '/signin') {
          isRedirecting = true
          router.push('/signin')
          return
        }

        if (user) {
          await fetch('/api/activity/ping', { method: 'POST' })
        }
      } catch (error) {
        console.error('Activity tracker error:', error)
      }
    }

    // Initial ping
    pingActivity()

    const interval = setInterval(pingActivity, 2000)
    
    return () => {
      clearInterval(interval)
    }
  }, [supabase, router, pathname])

  return null
} 