'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthError, User, Session } from '@supabase/supabase-js'
import { TokenManager } from '@/lib/tokenManager'

type AuthContextType = {
  userId: string | null
  token: string | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  token: null,
  isLoading: true
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthContextType>({
    userId: null,
    token: null,
    isLoading: true
  })

  useEffect(() => {
    // Get initial session
    supabase().auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        TokenManager.setToken(session.access_token)  // Store token
        TokenManager.setUserId(session.user.id)      // Store userId
        setAuthState({
          userId: session.user.id,
          token: session.access_token,
          isLoading: false
        })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase().auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        TokenManager.setToken(session.access_token)
        TokenManager.setUserId(session.user.id)
        setAuthState({
          userId: session.user.id,
          token: session.access_token,
          isLoading: false
        })
      } else {
        TokenManager.removeToken()
        TokenManager.removeUserId()
        setAuthState({
          userId: null,
          token: null,
          isLoading: false
        })
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Don't render children until we have auth state
  if (authState.isLoading) {
    return <div>Loading...</div>
  }

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 