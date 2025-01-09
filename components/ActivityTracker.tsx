'use client'

import { useEffect } from 'react'

export function ActivityTracker() {
  useEffect(() => {
    // Function to ping server to show we're active
    const pingActivity = () => {
      fetch('/api/activity/ping', { method: 'POST' })
    }

    // Initial ping
    pingActivity()

    // Set up polling interval
    const interval = setInterval(pingActivity, 2000)
    
    return () => {
      clearInterval(interval)
    }
  }, [])

  return null
} 