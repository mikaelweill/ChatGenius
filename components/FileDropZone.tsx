'use client'

import { useState, DragEvent, ReactNode } from 'react'

interface FileDropZoneProps {
  onFileDrop: (file: File) => void;
  children: ReactNode;
  className?: string;
}

export function FileDropZone({ onFileDrop, children, className = '' }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      onFileDrop(file)
    }
  }

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${className}`}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg flex items-center justify-center z-50">
          <div className="text-indigo-500 text-lg font-medium">
            Drop your file here
          </div>
        </div>
      )}
      {children}
    </div>
  )
} 