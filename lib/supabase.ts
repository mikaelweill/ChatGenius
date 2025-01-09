import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/auth-helpers-nextjs'

// For client-side operations with automatic session handling
export const createBrowserClient = () => {
  return createClientComponentClient()
}

// Type for our Supabase client
export type TypedSupabaseClient = SupabaseClient