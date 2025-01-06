'use client'

import { useState, useEffect } from "react"
import Link from "next/link"

type Channel = {
  id: string
  name: string
}

export function ChannelList() {
  return (
    <nav className="p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Channels</h2>
        <ul className="mt-2 space-y-1">
          <li className="px-2 py-1 hover:bg-gray-700 rounded cursor-pointer"># general</li>
          <li className="px-2 py-1 hover:bg-gray-700 rounded cursor-pointer"># random</li>
        </ul>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Direct Messages</h2>
        <ul className="mt-2 space-y-1">
          <li className="px-2 py-1 hover:bg-gray-700 rounded cursor-pointer">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>
            John Doe
          </li>
        </ul>
      </div>
    </nav>
  )
}

