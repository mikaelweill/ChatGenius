import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        isAI: false,  // Only get non-AI users
        NOT: {
          name: null  // Exclude users without names
        }
      },
      select: {
        id: true,
        name: true,
        isAI: true
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
} 