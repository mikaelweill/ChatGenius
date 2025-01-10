'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    email: string
  }
  channel: {
    id: string
    name: string
  }
  isDM: boolean
  dmPartner?: {
    id: string
    name: string
  }
}

export default function GlobalSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Perform search when debounced query changes
  useEffect(() => {
    async function performSearch() {
      if (!debouncedSearch) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`)
        const data = await response.json()
        if (response.ok) {
          setResults(data.results)
          setIsOpen(true)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedSearch])

  const handleResultClick = (result: SearchResult) => {
    if (result.isDM && result.dmPartner?.id) {
      router.push(`/channels/dm/${result.dmPartner.id}`)
    } else if (result.channel?.name) {
      router.push(`/channels/${result.channel.name}`)
    }
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => debouncedSearch && setIsOpen(true)}
          placeholder="Search messages..."
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
      </div>

      {isOpen && (results.length > 0 || isLoading) && (
        <div className="absolute mt-1 w-full bg-white rounded-lg shadow-lg border max-h-96 overflow-auto z-50">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {result.isDM 
                    ? (result.dmPartner ? `@${result.dmPartner.name}` : 'Unknown User')
                    : (result.channel ? `#${result.channel.name}` : 'Unknown Channel')
                  } • {result.author.name}
                </span>
                <span className="text-sm text-gray-600 truncate">
                  {result.content}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(result.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 