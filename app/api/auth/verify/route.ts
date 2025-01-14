import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("🔍 Verify request body:", body)
    
    // Create cookie store and await it
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Try both email and signup verification
    let error;
    
    try {
      // First try email verification
      const result = await supabase.auth.verifyOtp({
        email: body.email,
        token: body.token,
        type: 'email'
      })
      error = result.error
      
      // If email verification fails, try signup verification
      if (error?.message?.includes('Token has expired')) {
        console.log("📧 Email verification failed, trying signup verification...")
        const signupResult = await supabase.auth.verifyOtp({
          email: body.email,
          token: body.token,
          type: 'signup'
        })
        error = signupResult.error
      }
    } catch (verifyError) {
      console.error("❌ Verification error:", verifyError)
      error = verifyError
    }

    if (error) {
      console.error("❌ Final verify error:", error)
      return NextResponse.json({ error }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("💥 Verify error:", error)
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    )
  }
} 