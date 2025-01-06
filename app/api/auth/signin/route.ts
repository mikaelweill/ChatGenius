import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SignJWT } from "jose"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    console.log('Signing in with email:', email)

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split('@')[0],
      },
    })

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
    const token = await new SignJWT({ 
      email: user.email,
      id: user.id,
      name: user.name
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

    // Set cookie with more permissive options for testing
    const cookieStore = cookies()
    cookieStore.set('session-token', token, {
      httpOnly: false, // Allow JavaScript access for debugging
      secure: false,   // Allow HTTP for local testing
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 