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

// Disable Supabase logging
if (typeof window !== 'undefined') {
  console.debug = () => {}  // This will hide the Supabase debug logs
}

// Type for our Supabase client
export type TypedSupabaseClient = SupabaseClient
