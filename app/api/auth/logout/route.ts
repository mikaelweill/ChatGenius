import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    if (userId) {
      // Update user status to offline
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'offline' }
      })
    }

    // Sign out using Supabase
    await supabase.auth.signOut()

    return new Response(null, { status: 200 })
  } catch (error) {
    console.error('Error during logout:', error)
    return new Response(null, { status: 500 })
  }
} 