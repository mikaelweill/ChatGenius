import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"

// GET handler for fetching messages
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const channelId = searchParams.get('channelId')

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
  }

  const messages = await prisma.message.findMany({
    where: {
      channelId,
    },
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return NextResponse.json(messages)
}

// POST handler for creating messages
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if this is first time user (no DMs yet)
    const existingDMs = await prisma.directChat.findFirst({
      where: {
        participants: {
          some: { id: user.id }
        }
      }
    })

    if (!existingDMs) {
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
                  { id: user.id },
                  { id: existingUser.id }
                ]
              }
            }
          })
        )
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
} 