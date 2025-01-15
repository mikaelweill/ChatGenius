'use client'

import { useEffect, useState } from 'react'
import { getFileUrl } from '@/lib/uploadUtils'

interface AudioMessageProps {
  fileKey: string
  fileName: string
}

export function AudioMessage({ fileKey, fileName }: AudioMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string>('')

  useEffect(() => {
    async function fetchAudioUrl() {
      const url = await getFileUrl(fileKey)
      setAudioUrl(url)
    }
    fetchAudioUrl()
  }, [fileKey])

  return (
    <div className="flex items-center gap-2 my-2">
      <audio 
        controls 
        className="max-w-[300px] h-10"
        src={audioUrl}
      >
        Your browser does not support the audio element.
      </audio>
      <span className="text-xs text-gray-500">{fileName}</span>
    </div>
  )
} 