import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    console.log("📥 Signin request received")
    const body = await req.json()
    console.log("📋 Request body:", { email: body.email, hasCode: !!body.code })

    const { email, code } = body
    console.log("🔍 Processing signin for:", email)

    const supabase = createRouteHandlerClient({ cookies })
    
    let user;
    if (code === 'VERIFIED') {
      console.log("✅ User already verified, getting session")
      const session = await supabase.auth.getSession()
      user = session.data.session?.user
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

    if (code === 'VERIFIED' || code) {
      if (user) {
        console.log("👥 Checking for existing Prisma user")
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
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          console.log("✅ Prisma user created:", dbUser.id)

          // Get all existing users except the new user
          console.log("🤝 Setting up DM channels")
          const existingUsers = await prisma.user.findMany({
            where: { 
              id: { not: user.id } 
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
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
