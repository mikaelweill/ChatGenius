'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic } from 'lucide-react'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  disabled?: boolean
}

export function VoiceRecorder({ onRecordingComplete, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout>()

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      // Add a small delay before starting to record
      setTimeout(() => {
        mediaRecorder.start()
        setIsPreparing(false)
        setIsRecording(true)
      }, 500)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      setIsPreparing(false)
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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap">
          <span className={`text-sm font-medium ${isPreparing ? 'text-yellow-500' : 'text-red-500'}`}>
            {isPreparing ? 'Preparing...' : `Recording ${formatTime(recordingTime)}`}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isPreparing}
        className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors ${
          isRecording 
            ? 'bg-red-50 text-red-500 hover:bg-red-100'
            : isPreparing
              ? 'text-yellow-500 hover:bg-yellow-50'
              : 'text-gray-600 hover:bg-gray-100'
        }`}
        title={isRecording ? "Click to save recording" : "Click to start recording"}
      >
        <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
      </button>

      {isRecording && (
        <button
          onClick={stopRecording}
          className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs hover:bg-green-600"
          title="Save recording"
        >
          ✓
        </button>
      )}
    </div>
  )
} 