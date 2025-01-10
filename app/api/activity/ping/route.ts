import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from "next/server"

const OFFLINE_THRESHOLD = 30000 // 30 seconds
const CHECK_INACTIVE_INTERVAL = 5 // Check every 5th request

export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Single query that updates current user AND checks for inactive users
    await prisma.$transaction(async (tx) => {
      // Update current user's status and timestamp
      await tx.user.update({
        where: { id: userId },
        data: { 
          status: 'online',
          updatedAt: new Date()
        }
      })

      // Check for inactive users periodically
      if (Math.random() < 1/CHECK_INACTIVE_INTERVAL) {
        const inactiveUsers = await tx.user.updateMany({
          where: {
            AND: [
              { status: 'online' },
              { updatedAt: { lt: new Date(Date.now() - OFFLINE_THRESHOLD) } },
              { id: { not: userId } }
            ]
          },
          data: { status: 'offline' }
        })
        
        if (inactiveUsers.count > 0) {
          console.log(`Marked ${inactiveUsers.count} users as offline`)
        }
      }
    })

    // Get all online users
    const onlineUsers = await prisma.user.findMany({
      where: { status: 'online' },
      select: { id: true, status: true }
    })

    const statusMap = Object.fromEntries(
      onlineUsers.map(user => [user.id, user.status])
    )

    return NextResponse.json({ statuses: statusMap })
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
  }
} 