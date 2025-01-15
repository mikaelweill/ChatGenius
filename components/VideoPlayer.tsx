'use client'

interface VideoPlayerProps {
  src: string
  fileName: string
}

export function VideoPlayer({ src, fileName }: VideoPlayerProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 max-w-2xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-2xl">🎥</div>
        <div className="text-sm font-medium text-gray-700 truncate">
          {fileName}
        </div>
      </div>
      <video 
        controls 
        className="w-full rounded-lg" 
        preload="metadata"
      >
        <source src={src} type="video/webm" />
        Your browser does not support the video element.
      </video>
    </div>
  )
} 