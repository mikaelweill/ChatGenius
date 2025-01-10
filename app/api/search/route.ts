import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const channelId = searchParams.get('channelId')

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 })
    }

    // Search both channels and DMs
    const messages = await prisma.message.findMany({
      where: {
        AND: [
          // Search query
          {
            content: { contains: query, mode: 'insensitive' }
          },
          // Channel or DM condition
          {
            OR: [
              // If channelId is provided, only search in that channel
              ...(channelId ? [{
                channelId: channelId
              }] : [
                // Otherwise, search in all channels and user's DMs
                {
                  channelId: { not: null }  // Messages in any channel
                },
                {
                  directChat: {  // Messages in user's DMs
                    participants: {
                      some: { id: user.id }
                    }
                  }
                }
              ])
            ]
          }
        ]
      },
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
        },
        directChat: {
          include: {
            participants: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    console.log('Search found messages:', messages.length)

    return NextResponse.json({
      results: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        author: msg.author,
        channel: msg.channel,
        isDM: !!msg.directChat,
        dmPartner: msg.directChat 
          ? msg.directChat.participants.find(p => p.id !== user.id)
          : null
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