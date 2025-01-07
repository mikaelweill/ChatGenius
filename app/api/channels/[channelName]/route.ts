import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: { channelName: string } }
) {
  if (!params.channelName) {
    return NextResponse.json({ error: 'Channel name required' }, { status: 400 })
  }

  try {
    const channel = await prisma.channel.findUnique({
      where: { name: params.channelName },
    })

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Prevent deletion of the general channel
    if (channel.name === 'general') {
      return NextResponse.json(
        { error: "Cannot delete the general channel" },
        { status: 403 }
      )
    }

    // Delete related messages and memberships first
    await prisma.message.deleteMany({
      where: { channelId: channel.id },
    })

    await prisma.channelMembership.deleteMany({
      where: { channelId: channel.id },
    })

    // Now delete the channel
    await prisma.channel.delete({
      where: { id: channel.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting channel:', error)
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 })
  }
} 