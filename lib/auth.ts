import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { type User } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Types
interface AuthError {
  message: string
  status: number
  code?: string
  details?: string
}

// Error types
const AUTH_ERRORS = {
  NO_USER: { message: 'No user found', status: 401, code: 'AUTH_NO_USER' },
  INVALID_TOKEN: { message: 'Invalid or expired token', status: 401, code: 'AUTH_INVALID_TOKEN' },
  SERVER_ERROR: { message: 'Internal server error', status: 500, code: 'AUTH_SERVER_ERROR' },
  COOKIE_ERROR: { message: 'Failed to access cookie store', status: 500, code: 'AUTH_COOKIE_ERROR' },
  RATE_LIMIT: { message: 'Too many requests', status: 429, code: 'AUTH_RATE_LIMIT' }
} as const

// Server-side utilities
export async function getServerUser() {
  let cookieStore
  try {
    cookieStore = cookies()
  } catch (err: any) {
    return { user: null, error: { ...AUTH_ERRORS.COOKIE_ERROR, details: err?.message } }
  }

  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore 
  })
  
  try {
    // Get both user and session
    const [userResponse, sessionResponse] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession()
    ])
    
    const { data: { user }, error: userError } = userResponse
    const { data: { session }, error: sessionError } = sessionResponse
    
    if (userError || sessionError) {
      const error = userError || sessionError
      if (error?.message?.includes('token')) {
        return { user: null, error: AUTH_ERRORS.INVALID_TOKEN }
      }
      if (error?.status === 429) {
        return { user: null, error: AUTH_ERRORS.RATE_LIMIT }
      }
      throw error || new Error('Unknown authentication error')
    }
    
    if (user && session) {
      return { user, error: null }
    }
    
    return { user: null, error: AUTH_ERRORS.NO_USER }
    
  } catch (err: any) {
    return { 
      user: null, 
      error: { 
        ...AUTH_ERRORS.SERVER_ERROR,
        details: err?.message 
      } 
    }
  }
}

// API route utility
export async function getAPIUser(cookieStore: () => ReturnType<typeof cookies>) {
  try {
    const supabase = createRouteHandlerClient({ cookies: cookieStore })
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      if (error.message?.includes('token')) {
        return { user: null, error: AUTH_ERRORS.INVALID_TOKEN }
      }
      if (error.status === 429) {
        return { user: null, error: AUTH_ERRORS.RATE_LIMIT }
      }
      throw error
    }
    
    if (!user) {
      return { user: null, error: AUTH_ERRORS.NO_USER }
    }
    
    return { user, error: null }
  } catch (err: any) {
    return { 
      user: null, 
      error: { 
        ...AUTH_ERRORS.SERVER_ERROR,
        details: err?.message 
      } 
    }
  }
} 