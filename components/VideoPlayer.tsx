'use client'

interface VideoPlayerProps {
  src: string | null
  fileName: string
}

export function VideoPlayer({ src, fileName }: VideoPlayerProps) {
  if (!src) {
    return (
      <div className="rounded-lg border border-gray-200 p-3 max-w-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-2xl">🎥</div>
          <div className="text-sm font-medium text-gray-700 truncate">
            {fileName}
          </div>
        </div>
        <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
          <span className="text-gray-400">Loading video...</span>
        </div>
      </div>
    )
  }

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
        src={src}
      >
        Your browser does not support the video element.
      </video>
    </div>
  )
} 