import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getAPIUser, clearAuthCache } from '@/lib/auth'

export async function POST(req: Request) {
  let user: any;
  let code: string | undefined;
  let body: any;
  
  try {
    console.log("📥 Signin request received")
    clearAuthCache()
    
    body = await req.json()
    const { email, code: receivedCode } = body
    code = receivedCode
    console.log("📋 Request body:", { email, hasCode: !!code })

    const supabase = createRouteHandlerClient({ cookies })
    
    if (code === 'VERIFIED') {
      console.log("✅ User already verified, getting session")
      const { user: authUser, error: authError } = await getAPIUser(() => cookies())
      if (authError || !authUser) {
        console.error("❌ Auth error:", authError)
        throw authError || new Error('Failed to get user')
      }
      user = authUser
      console.log("👤 Got user from session:", user?.id)
    } else if (code) {
      console.log("🔐 Verifying OTP code")
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      })

      if (verifyError) {
        console.error("❌ OTP verification failed:", verifyError)
        throw verifyError
      }
      console.log("✅ OTP verified successfully")
      user = verifyData.user
    } else {
      console.log("📧 Sending OTP email")
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
      })
      if (signInError) {
        console.error("❌ Failed to send OTP:", signInError)
        throw signInError
      }
      console.log("📤 OTP email sent successfully")
    }

    if (!user) {
      console.error("❌ No user object after auth flow")
      throw new Error('No user object after auth flow')
    }

    if (code === 'VERIFIED' || code) {
      if (user) {
        console.log("👥 Checking for existing Prisma user")
        clearAuthCache()
        let dbUser = await prisma.user.findUnique({
          where: { id: user.id }
        })

        if (dbUser) {
          console.log("🟢 Updating user status to online")
          await prisma.user.update({
            where: { id: user.id },
            data: { status: 'online' }
          })
        } else {
          console.log("🆕 Creating new Prisma user")
          dbUser = await prisma.user.create({
            data: {
              id: user.id,
              email: user.email!,
              name: email.split('@')[0],
              status: 'online',
              isAI: false,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          console.log("✅ Prisma user created:", dbUser.id)

          // Create AI counterpart
          console.log("🤖 Creating AI counterpart")
          const aiUser = await prisma.user.create({
            data: {
              id: `ai_${user.id}`,
              email: `ai_${user.email}`,
              name: `AI_${dbUser.name}`,
              status: 'online',
              isAI: true,
              aiOwner: user.id,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          console.log("✅ AI counterpart created:", aiUser.id)

          // Get all existing users except the new user
          console.log("🤝 Setting up DM channels")
          const existingUsers = await prisma.user.findMany({
            where: { 
              AND: [
                { id: { not: user.id } },
                { isAI: false }
              ]
            },
            select: { id: true }
          })

          console.log(`📨 Creating DMs with ${existingUsers.length} users`)
          
          // Create DMs with all existing users
          await Promise.all(
            existingUsers.map(existingUser => 
              prisma.directChat.create({
                data: {
                  participants: {
                    connect: [
                      { id: user!.id },
                      { id: existingUser.id }
                    ]
                  }
                }
              })
            )
          )
          console.log("✅ DM channels created successfully")
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("💥 Signin error:", error)
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        name: error.name,
        isPrismaError: error.name === 'PrismaClientKnownRequestError'
      })
    }
    
    console.error("Current state:", {
      hasUser: !!user,
      hasCode: !!code,
      email: body?.email
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    )
  }
}
