'use client'

import { useState, useEffect } from "react"
import Link from "next/link"

type Channel = {
  id: string
  name: string
}

export default function ChannelList() {
  const [channels, setChannels] = useState<Channel[]>([])

  useEffect(() => {
    // Fetch channels from API
    const fetchChannels = async () => {
      // Replace with actual API call
      const response = await fetch('/api/channels')
      const data = await response.json()
      setChannels(data)
    }

    fetchChannels()
  }, [])

  return (
    <div className="w-64 bg-gray-100 h-screen p-4">
      <h2 className="text-xl font-semibold mb-4">Channels</h2>
      <ul>
        {channels.map((channel) => (
          <li key={channel.id} className="mb-2">
            <Link href={`/channels/${channel.id}`} className="text-blue-600 hover:underline">
              # {channel.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

