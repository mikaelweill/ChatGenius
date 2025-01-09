'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export function ActivityTracker() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    let isRedirecting = false

    const pingActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        // Only redirect if we haven't started redirecting yet
        if (!user && !isRedirecting) {
          isRedirecting = true
          router.push('/signin')
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
  }, [supabase, router])

  return null
} 