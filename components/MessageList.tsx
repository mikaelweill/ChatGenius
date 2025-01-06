'use client'

import { useState, useEffect } from "react"

type Message = {
  id: string
  content: string
  author: {
    name: string
  }
  createdAt: string
}

type MessageListProps = {
  channelId: string
}

export function MessageList() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 rounded-full bg-gray-300"></div>
        <div>
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold">John Doe</span>
            <span className="text-sm text-gray-500">12:34 PM</span>
          </div>
          <p className="text-gray-700">Hello world!</p>
        </div>
      </div>
    </div>
  )
}

