'use client'

import { createContext } from 'react'

export const SessionContext = createContext<any>(null)

interface SessionProviderProps {
  session: any
  children: React.ReactNode
}

export function SessionProvider({ session, children }: SessionProviderProps) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
} 