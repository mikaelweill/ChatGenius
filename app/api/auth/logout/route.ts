import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    console.log("🔑 Logout: Processing for user:", userId)

    if (userId) {
      try {
        // Update user status to offline
        const updatedUser = await prisma.user.update({
          where: { id: userId },
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
    await supabase.auth.signOut()
    console.log("👋 User signed out successfully")

    return new Response(null, { status: 200 })
  } catch (error) {
    console.error('💥 Error during logout:', error)
    return new Response(null, { status: 500 })
  }
} 