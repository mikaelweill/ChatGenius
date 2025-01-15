'use client'

import { useState, useRef, useEffect } from 'react'
import { Video, Square } from 'lucide-react'  // Using Video instead of Camera

interface VideoRecorderProps {
  onRecordingComplete: (videoBlob: Blob) => void
  disabled?: boolean
}

export function VideoRecorder({ onRecordingComplete, disabled = false }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout>()
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setRecordingTime(0)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      setIsPreparing(true)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true 
      })
      
      // Make sure we have both video and audio tracks
      if (!stream.getVideoTracks().length || !stream.getAudioTracks().length) {
        throw new Error('Camera or microphone not available')
      }
      
      streamRef.current = stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
      }

      // Set up MediaRecorder with better video quality
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Request data more frequently for better quality
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { 
          type: 'video/webm;codecs=vp8,opus' 
        })
        console.log('Video blob type:', videoBlob.type)
        
        // Just call onRecordingComplete with the blob
        onRecordingComplete(videoBlob)
        
        // Clean up
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null
        }
      }

      // Start recording with smaller timeslices for better quality
      setTimeout(() => {
        mediaRecorder.start(100) // Record in 100ms chunks
        setIsPreparing(false)
        setIsRecording(true)
      }, 500)

    } catch (error) {
      console.error('Error accessing camera:', error)
      setIsPreparing(false)
      // You might want to show an error message to the user
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <div className="relative">
      {(isRecording || isPreparing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-black rounded-lg overflow-hidden shadow-xl max-w-2xl w-full aspect-video">
            <button
              onClick={stopRecording}
              className="absolute top-4 right-4 text-white hover:text-gray-200 z-10"
              title="Cancel recording"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <video 
              ref={videoPreviewRef} 
              className="w-full h-full object-cover"
              autoPlay 
              muted 
              playsInline
            />

            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
              <span className="text-white font-medium">
                {isPreparing ? 'Preparing...' : `Recording ${formatTime(recordingTime)}`}
              </span>
              
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
                  title="Stop and save recording"
                >
                  Stop Recording
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={!isRecording ? startRecording : undefined}
        disabled={disabled || isPreparing}
        className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors ${
          isRecording 
            ? 'bg-red-50 text-red-500'
            : isPreparing
              ? 'text-yellow-500 hover:bg-yellow-50'
              : 'text-gray-600 hover:bg-gray-100'
        }`}
        title={isRecording ? "Recording in progress" : "Click to start recording"}
      >
        <Video className="w-5 h-5" />
      </button>
    </div>
  )
} 