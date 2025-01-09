import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/auth-helpers-nextjs'

// Export both the client and the creator function
export const supabase = createClientComponentClient()

export const createBrowserClient = () => {
  return createClientComponentClient()
}

// Type for our Supabase client
export type TypedSupabaseClient = SupabaseClient
