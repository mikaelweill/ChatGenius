import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(req: Request) {
  const { pathname } = new URL(req.url)
  const channelId = pathname.split('/').pop()

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
  }

  try {
    // Delete related messages and memberships first
    await prisma.message.deleteMany({
      where: { channelId },
    })

    await prisma.channelMembership.deleteMany({
      where: { channelId },
    })

    // Now delete the channel
    await prisma.channel.delete({
      where: { id: channelId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting channel:', error)
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 })
  }
} 