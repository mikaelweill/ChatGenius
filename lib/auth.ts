import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { type User } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Types
interface CachedUser {
  user: User | null
  timestamp: number
}

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

// Server-side cache
const AUTH_CACHE = new Map<string, CachedUser>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Server-side utilities
export async function getServerUser() {
  let cookieStore
  try {
    cookieStore = cookies()
  } catch (err: any) {
    clearAuthCache() // Clear cache on cookie errors
    return { user: null, error: { ...AUTH_ERRORS.COOKIE_ERROR, details: err?.message } }
  }

  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore 
  })
  
  const cacheKey = 'auth_user'
  const cached = AUTH_CACHE.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // Even with cache, verify the session is still valid
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      clearAuthCache()
      return { user: null, error: AUTH_ERRORS.INVALID_TOKEN }
    }
    return { user: cached.user, error: null }
  }
  
  try {
    // Get both user and session
    const [userResponse, sessionResponse] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession()
    ])
    
    const { data: { user }, error: userError } = userResponse
    const { data: { session }, error: sessionError } = sessionResponse
    
    if (userError || sessionError) {
      // Clear cache and handle specific Supabase error cases
      clearAuthCache()
      
      const error = userError || sessionError
      if (error?.message?.includes('token')) {
        return { user: null, error: AUTH_ERRORS.INVALID_TOKEN }
      }
      if (error?.status === 429) {
        return { user: null, error: AUTH_ERRORS.RATE_LIMIT }
      }
      throw error || new Error('Unknown authentication error')
    }
    
    // Only cache if we have both valid user and session
    if (user && session) {
      AUTH_CACHE.set(cacheKey, {
        user,
        timestamp: Date.now()
      })
      return { user, error: null }
    }
    
    // Clear cache if no user or session found
    clearAuthCache()
    return { user: null, error: AUTH_ERRORS.NO_USER }
    
  } catch (err: any) {
    clearAuthCache() // Clear cache on unexpected errors
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
      // Clear cache and handle specific API route error cases
      clearAuthCache()
      
      if (error.message?.includes('token')) {
        return { user: null, error: AUTH_ERRORS.INVALID_TOKEN }
      }
      if (error.status === 429) {
        return { user: null, error: AUTH_ERRORS.RATE_LIMIT }
      }
      throw error
    }
    
    if (!user) {
      clearAuthCache()
      return { user: null, error: AUTH_ERRORS.NO_USER }
    }
    
    return { user, error: null }
  } catch (err: any) {
    clearAuthCache() // Clear cache on unexpected errors
    return { 
      user: null, 
      error: { 
        ...AUTH_ERRORS.SERVER_ERROR,
        details: err?.message 
      } 
    }
  }
}

// Helper to clear cache (useful for logout)
export function clearAuthCache() {
  AUTH_CACHE.clear()
} 