import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Get user ID from cookie before removing it
    const cookieStore = cookies()
    const token = cookieStore.get('session-token')?.value

    if (token) {
      // Decode token to get user ID
      const payload = token.split('.')[1]
      const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8')
      const { id: userId } = JSON.parse(decodedPayload)

      // Update user status to offline
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'offline' }
      })
    }

    return new Response(null, {
      status: 200,
      headers: {
        'Set-Cookie': 'session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    })
  } catch (error) {
    console.error('Error during logout:', error)
    return new Response(null, { status: 500 })
  }
} 