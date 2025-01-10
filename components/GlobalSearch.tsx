'use client'

import { useState } from 'react'

export default function GlobalSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  
  return (
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search messages..."
        className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
} 