import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session-token')?.value

    if (token) {
      const payload = token.split('.')[1]
      const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8')
      const { id: userId } = JSON.parse(decodedPayload)

      // Single query that updates current user AND checks for inactive users
      await prisma.$transaction(async (tx) => {
        // Update current user
        await tx.user.update({
          where: { id: userId },
          data: { status: 'online' }
        })

        // Only check for inactive users every 10 seconds
        if (Math.random() < 0.2) { // ~20% chance = every 10 seconds on average
          await tx.user.updateMany({
            where: {
              AND: [
                { status: 'online' },
                { updatedAt: { lt: new Date(Date.now() - 3000) } },
                { id: { not: userId } } // Don't mark current user as offline
              ]
            },
            data: { status: 'offline' }
          })
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
  }
} 