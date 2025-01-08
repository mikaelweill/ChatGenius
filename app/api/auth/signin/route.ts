import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SignJWT } from "jose"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    console.log("Signing in with email:", email)

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
        },
      })

      // Get all existing users except the new user
      const existingUsers = await prisma.user.findMany({
        where: { 
          id: { not: user.id } 
        },
        select: { id: true }
      })

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
    }

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
    const token = await new SignJWT({
      email: user.email,
      id: user.id,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret)

    // Set cookie
    const cookieStore = cookies()
    await cookieStore.set("session-token", token, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
