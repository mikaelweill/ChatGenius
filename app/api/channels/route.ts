import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json(channels)
  } catch (error) {
    console.error('Error fetching channels:', error)
    return new NextResponse('Error fetching channels', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json()
    
    const channel = await prisma.channel.create({
      data: {
        name,
        description: `Channel for ${name}`
      }
    })

    return NextResponse.json(channel)
  } catch (error) {
    console.error('Error creating channel:', error)
    return new NextResponse('Error creating channel', { status: 500 })
  }
} 