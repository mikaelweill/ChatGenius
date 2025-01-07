'use client'

import { MessageSquare } from 'lucide-react'

export function DirectMessagesList() {
  return (
    <div className="space-y-2">
      <div className="px-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Direct Messages
        </h2>
      </div>
      <div className="space-y-1">
        <div className="px-2 py-1 text-sm text-gray-500 italic">
          No direct messages yet
        </div>
      </div>
    </div>
  )
} 