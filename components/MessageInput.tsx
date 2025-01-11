'use client'

import { useState, useRef, useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { FileDropZone } from './FileDropZone'
import { uploadFile } from '@/lib/uploadUtils'
import { eventBus } from '@/lib/eventBus'

interface UploadState {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadedFile {
  fileKey: string;
  fileName: string;
  fileType: string;
}

export function MessageInput({ channelId, isDM = false }: { channelId: string, isDM?: boolean }) {
  const [content, setContent] = useState('')
  const [uploadState, setUploadState] = useState<UploadState | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { socket, isConnected } = useSocket({ channelId })

  const handleFileSelect = async (file: File) => {
    try {
      const result = await uploadFile(file, (progress) => {
        setUploadState(progress)
      });

      // Store the uploaded file info instead of sending immediately
      setUploadedFile({
        fileKey: result.fileKey,
        fileName: result.fileName,
        fileType: result.fileType
      });
      setUploadState(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadState({
        progress: 0,
        status: 'error',
        error: 'Failed to upload file'
      });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && !uploadedFile) || !isConnected || !socket) return

    try {
      socket.emit('new_message', { 
        content: content.trim(), 
        channelId,
        isDM,
        ...(uploadedFile && {
          attachment: {
            url: uploadedFile.fileKey,
            type: uploadedFile.fileType,
            name: uploadedFile.fileName
          }
        })
      })
      setContent('')
      setUploadedFile(null) // Clear the uploaded file after sending
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      eventBus.emitFileDrop(file);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    // Clear the actual file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  useEffect(() => {
    const unsubscribe = eventBus.onFileDrop((file) => {
      handleFileSelect(file);
    });

    return () => unsubscribe();
  }, []);  // Empty deps since handleFileSelect is stable

  return (
    <div className="relative">
      <div className="absolute bottom-full w-full pb-2">
        {uploadState && uploadState.status === 'uploading' && (
          <div className="bg-white p-2 rounded-t-lg shadow-sm border border-b-0">
            <div className="text-sm text-gray-600">
              Uploading... {Math.round(uploadState.progress)}%
            </div>
          </div>
        )}
        {uploadState?.status === 'error' && (
          <div className="bg-white p-2 rounded-t-lg shadow-sm border border-b-0">
            <div className="text-sm text-red-600">
              {uploadState.error}
            </div>
          </div>
        )}
        {uploadedFile && (
          <div className="bg-white p-2 rounded-t-lg shadow-sm border border-b-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Ready to send: {uploadedFile.fileName}
              </span>
              <button
                type="button"
                onClick={clearUploadedFile}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      <FileDropZone onFileDrop={(file) => eventBus.emitFileDrop(file)}>
        <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={uploadedFile ? "Add a message (optional)" : "Type a message..."}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!isConnected || uploadState?.status === 'uploading'}
            />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              onClick={handleFileButtonClick}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              disabled={uploadState?.status === 'uploading' || uploadedFile !== null}
            >
              📎
            </button>
            <button
              type="submit"
              disabled={!isConnected || (!content.trim() && !uploadedFile) || uploadState?.status === 'uploading'}
              className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </FileDropZone>
    </div>
  )
} 