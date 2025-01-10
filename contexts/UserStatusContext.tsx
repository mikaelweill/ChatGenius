'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useIdleTimer } from 'react-idle-timer'
import { TokenManager } from '@/lib/tokenManager'
import { useSocket } from '@/hooks/useSocket'

interface UserStatus {
  status: 'online' | 'offline'
  updatedAt: Date
}

interface UserStatusContextType {
  statuses: Record<string, UserStatus>
  updateStatuses: (newStatuses: Record<string, UserStatus>) => void
}

const UserStatusContext = createContext<UserStatusContextType>({
  statuses: {},
  updateStatuses: () => {}
})

export function UserStatusProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({})
  const { socket, isConnected } = useSocket({})
  const userId = TokenManager.getUserId()

  useEffect(() => {
    console.log('=== Status Debug ===')
    console.log('Current statuses:', statuses)
    console.log('Current user:', userId)
    console.log('Socket connected:', isConnected)
    console.log('Socket ID:', socket?.id)
  }, [statuses, userId, isConnected, socket])

  // Debug socket state
  useEffect(() => {
    console.log('=== Socket State Debug ===', {
      hasSocket: !!socket,
      isConnected,
      userId,
      socketId: socket?.id
    })
  }, [socket, isConnected, userId])

  // Set initial status when socket connects
  useEffect(() => {
    if (!socket || !userId || !isConnected) {
      console.log('Not ready:', { hasSocket: !!socket, userId, isConnected })
      return
    }

    console.log('=== Client Status Debug ===')
    console.log('1. Setting initial status for:', userId)
    
    const initialStatus = {
      status: 'online' as const,
      updatedAt: new Date()
    }

    console.log('=== Emitting Initial Status ===')
    console.log('User:', userId)
    console.log('Status:', initialStatus)
    console.log('Socket:', socket?.id)

    // Set our own status first
    setStatuses(prev => {
      console.log('2. Previous statuses:', prev)
      const next = {
        ...prev,
        [userId]: initialStatus
      }
      console.log('3. New statuses:', next)
      return next
    })

    // Broadcast our status
    console.log('4. Broadcasting our status')
    socket.emit('status', {
      userId,
      ...initialStatus
    })

    // Request other users' statuses
    console.log('5. Requesting other users statuses')
    socket.emit('request_statuses')

    // Handle cleanup
    return () => {
      if (socket && userId) {
        console.log('6. Emitting offline status on cleanup')
        socket.emit('status', {
          userId,
          status: 'offline',
          updatedAt: new Date()
        })
      }
    }
  }, [socket, userId, isConnected])

  // Listen for status updates
  useEffect(() => {
    if (!socket) return

    socket.on('initial_statuses', (initialStatuses: Array<{ userId: string, status: 'online' | 'offline', updatedAt: Date }>) => {
      console.log('7. Received initial statuses:', initialStatuses)
      const statusMap: Record<string, UserStatus> = {}
      initialStatuses.forEach(({ userId, status, updatedAt }) => {
        statusMap[userId] = {
          status,
          updatedAt: new Date(updatedAt)
        }
      })
      setStatuses(prev => ({
        ...prev,
        ...statusMap
      }))
    })

    socket.on('status_update', (data: { userId: string, status: 'online' | 'offline', updatedAt: Date }) => {
      console.log('=== Received Status Update ===')
      console.log('Data:', data)
      console.log('Current statuses:', statuses)
      setStatuses(prev => {
        const next = {
          ...prev,
          [data.userId]: {
            status: data.status,
            updatedAt: new Date(data.updatedAt)
          }
        }
        console.log('New statuses:', next)
        return next
      })
    })

    socket.on('user_disconnected', (disconnectedUserId: string) => {
      console.log('9. User disconnected:', disconnectedUserId)
      setStatuses(prev => ({
        ...prev,
        [disconnectedUserId]: {
          status: 'offline',
          updatedAt: new Date()
        }
      }))
    })

    return () => {
      socket.off('initial_statuses')
      socket.off('status_update')
      socket.off('user_disconnected')
    }
  }, [socket])

  // Handle window/tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!socket || !userId) return

      const status = document.hidden ? 'offline' : 'online'
      console.log('10. Visibility changed:', { status, userId })
      
      socket.emit('status', {
        userId,
        status,
        updatedAt: new Date()
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [socket, userId])

  // Handle idle state
  const { start: startIdleTimer } = useIdleTimer({
    timeout: 60 * 1000, // 1 minute
    throttle: 2000, // 2 seconds
    onIdle: () => {
      if (!socket || !userId) return
      console.log('11. User went idle:', userId)
      socket.emit('status', {
        userId,
        status: 'offline',
        updatedAt: new Date()
      })
    },
    onActive: () => {
      if (!socket || !userId) return
      console.log('12. User became active:', userId)
      socket.emit('status', {
        userId,
        status: 'online',
        updatedAt: new Date()
      })
    }
  })

  // Start idle timer when socket is connected
  useEffect(() => {
    if (isConnected) {
      console.log('13. Starting idle timer')
      startIdleTimer()
    }
  }, [isConnected, startIdleTimer])

  // Add this effect to handle cleanup on unmount or logout
  useEffect(() => {
    if (!socket || !userId) return

    const cleanup = () => {
      console.log('Cleaning up user status:', userId)
      socket.emit('status', {
        userId,
        status: 'offline',
        updatedAt: new Date()
      })
      
      // Clear the status immediately in the local state
      setStatuses(prev => ({
        ...prev,
        [userId]: {
          status: 'offline',
          updatedAt: new Date()
        }
      }))
    }

    // Add cleanup for component unmount
    return () => {
      cleanup()
    }
  }, [socket, userId])

  // Add this effect to handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && userId) {
        socket.emit('status', {
          userId,
          status: 'offline',
          updatedAt: new Date()
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [socket, userId])

  return (
    <UserStatusContext.Provider value={{ statuses, updateStatuses: setStatuses }}>
      {children}
    </UserStatusContext.Provider>
  )
}

export const useUserStatus = () => useContext(UserStatusContext) 