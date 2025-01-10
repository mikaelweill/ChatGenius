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

function getHighlightedSnippet(content: string, query: string, snippetLength = 150) {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matchIndex = lowerContent.indexOf(lowerQuery)
  
  if (matchIndex === -1) return content.slice(0, snippetLength) + '...'

  // Calculate start and end positions for the snippet
  const start = Math.max(0, matchIndex - snippetLength / 3)
  const end = Math.min(content.length, matchIndex + query.length + snippetLength / 3)
  let snippet = content.slice(start, end)

  // Add ellipsis if we're cutting content
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet += '...'

  // Split the query into words for highlighting
  const queryWords = query.split(' ').filter(word => word.length > 0)
  
  // Replace each word with a highlighted version
  queryWords.forEach(word => {
    const regex = new RegExp(`(${word})`, 'gi')
    snippet = snippet.replace(regex, '<strong>$1</strong>')
  })

  return snippet
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text
  
  // Split query into words and escape special regex characters
  const words = query.split(' ')
    .filter(word => word.length > 0)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  
  // Create regex that matches any of the words
  const regex = new RegExp(`(${words.join('|')})`, 'gi')
  
  // Replace matches with highlighted version
  return text.replace(regex, '<strong>$1</strong>')
}

interface GlobalSearchProps {
  userId?: string
}

export default function GlobalSearch({ userId }: GlobalSearchProps) {
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
          console.log('Search results:', data.results.length)
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
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {result.isDM 
                    ? (result.dmPartner 
                        ? <span dangerouslySetInnerHTML={{ 
                            __html: `@${highlightText(result.dmPartner.name, searchQuery)}`
                          }} />
                        : 'Unknown User')
                    : (result.channel 
                        ? <span dangerouslySetInnerHTML={{ 
                            __html: `#${highlightText(result.channel.name, searchQuery)}`
                          }} />
                        : 'Unknown Channel')
                  } • <span dangerouslySetInnerHTML={{ 
                      __html: highlightText(result.author.name, searchQuery)
                    }} />
                </span>
                <span 
                  className="text-sm text-gray-600 line-clamp-2"
                  dangerouslySetInnerHTML={{ 
                    __html: getHighlightedSnippet(result.content, searchQuery)
                  }}
                />
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