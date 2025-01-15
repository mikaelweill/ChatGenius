'use client'

import { useState } from 'react'
import { formatRelativeTime } from '@/lib/timeUtils'
import { getFileUrl } from '@/lib/uploadUtils'
import { AudioMessage } from './AudioMessage'

interface MessageProps {
  message: {
    id: string
    content: string
    createdAt: string
    author: {
      id: string
      name: string
      isAI: boolean
    }
    attachment?: {
      url: string
      type: string
      name: string
    }
  }
}

export function Message({ message }: MessageProps) {
  const handleFileClick = async (e: React.MouseEvent, attachment: any) => {
    e.preventDefault()
    const url = await getFileUrl(attachment.url)
    window.open(url, '_blank')
  }

  return (
    <div className="py-2">
      {/* ... author and content ... */}
      
      {message.attachment && (
        message.attachment.type.startsWith('audio/') ? (
          <AudioMessage 
            fileKey={message.attachment.url} 
            fileName={message.attachment.name}
          />
        ) : (
          <div className="mt-2">
            <a 
              href="#" 
              onClick={(e) => handleFileClick(e, message.attachment)}
              className="text-blue-500 hover:underline"
            >
              📎 {message.attachment.name}
            </a>
          </div>
        )
      )}
    </div>
  )
} 