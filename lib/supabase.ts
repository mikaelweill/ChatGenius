import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/auth-helpers-nextjs'

// Create a single instance of the client
let supabaseInstance: SupabaseClient | null = null

// Export a function to get the client with caching
export const supabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient({
      cookieOptions: {
        name: 'sb-session',
        secure: true,
        sameSite: 'lax',
        path: '/'
      }
    })
  }
  return supabaseInstance
}

// For backward compatibility
export const createBrowserClient = supabase

// Suppress Supabase logs
if (process.env.NODE_ENV === 'development') {
  console.debug = () => {}  // Suppress debug logs
  console.info = () => {}   // Suppress info logs
}

// Type for our Supabase client
export type TypedSupabaseClient = SupabaseClient
