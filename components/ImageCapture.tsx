'use client'

import React, { useState, useRef } from 'react'
import { Camera } from 'lucide-react'

interface ImageCaptureProps {
  onImageCapture: (imageBlob: Blob) => void
  disabled?: boolean
}

export function ImageCapture({ onImageCapture, disabled = false }: ImageCaptureProps): React.JSX.Element {
  const [isActive, setIsActive] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [streamReady, setStreamReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      console.log('Starting camera...')
      setIsPreparing(true)
      setIsActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true  // Simplify for testing
      })
      console.log('Got stream:', stream)
      
      streamRef.current = stream
      if (videoRef.current) {
        console.log('Setting video source...')
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setStreamReady(true)
          setIsPreparing(false)
        }
      }
    } catch (error) {
      console.error('Camera error:', error)
      setIsActive(false)
      setIsPreparing(false)
    }
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    setIsActive(false)
    setPreviewUrl(null)
  }

  const captureImage = () => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.drawImage(videoRef.current, 0, 0)

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        onImageCapture(blob)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      setIsActive(false)
    }, 'image/jpeg', 0.8)
  }

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <div className="relative">
      {isActive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-black rounded-lg overflow-hidden shadow-xl max-w-2xl w-full aspect-video">
            <button
              onClick={stopStream}
              className="absolute top-4 right-4 text-white hover:text-gray-200 z-10"
              title="Cancel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {!streamReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white">Loading camera...</div>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={captureImage}
                className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
              >
                Take Photo
              </button>
            </div>
          </div>
        </div>
      )}
      
      {previewUrl && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2">
          <div className="bg-white rounded-lg shadow-lg p-2 border">
            <img 
              src={previewUrl} 
              alt="Captured" 
              className="w-24 h-24 object-cover rounded"
            />
          </div>
        </div>
      )}
      
      <button
        type="button"
        onClick={startCamera}
        disabled={disabled || isPreparing}
        className={`p-2 text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors ${
          isPreparing ? 'opacity-50' : ''
        }`}
      >
        <Camera className="w-5 h-5" />
      </button>
    </div>
  )
} 