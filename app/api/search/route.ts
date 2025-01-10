import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const channelId = searchParams.get('channelId') // Optional channel filter

    // Auth check
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 })
    }

    // Build the where clause based on whether channelId is provided
    const whereClause = channelId 
      ? {
          AND: [
            { content: { contains: query, mode: 'insensitive' } },
            { channelId }
          ]
        }
      : {
          content: { contains: query, mode: 'insensitive' }
        }

    // Search messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        channel: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Limit results
    })

    return NextResponse.json({
      results: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        author: msg.author,
        channel: msg.channel
      }))
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
} 