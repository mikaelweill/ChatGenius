import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

export async function POST(req: Request) {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies()
    const token = cookieStore.get('next-auth.session-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify JWT
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
    const { payload } = await jwtVerify(token.value, secret)

    if (!payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { content, channelId } = await req.json()

    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        authorId: payload.id as string,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
} 