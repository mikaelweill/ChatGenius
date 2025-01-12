import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getAPIUser, clearAuthCache } from '@/lib/auth'

export async function POST() {
  try {
    const cookieStore = cookies()
    const { user, error } = await getAPIUser(() => cookieStore)
    
    if (error) {
      console.error("❌ Auth error during logout:", error)
      // Continue with signout even if auth check fails
    }

    if (user?.id) {
      try {
        // Update user status to offline
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { status: 'offline' }
        })
        console.log("✅ Status updated to offline for user:", updatedUser.id)
      } catch (dbError) {
        console.error("❌ Failed to update status:", dbError)
        // Continue with signout even if status update fails
      }
    } else {
      console.log("⚠️ No user ID found in session")
    }

    // Sign out using Supabase
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.signOut()
    console.log("👋 User signed out successfully")

    // Clear auth cache
    clearAuthCache()

    return new Response(null, { status: 200 })
  } catch (error) {
    console.error('💥 Error during logout:', error)
    return new Response(null, { status: 500 })
  }
} 