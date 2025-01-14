'use client'

import { useState, useRef, useEffect } from 'react'
import { useSocketRoom } from '@/hooks/useSocket'
import { FileDropZone } from './FileDropZone'
import { uploadFile } from '@/lib/uploadUtils'
import { eventBus } from '@/lib/eventBus'
import { parseAICommand, shouldShowAIFormatting } from '@/lib/commandParser'

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

interface User {
  id: string;
  name: string;
  isAI: boolean;
}

export function MessageInput({ channelId, isDM = false }: { channelId: string, isDM?: boolean }) {
  const [content, setContent] = useState('')
  const [showAIFormatting, setShowAIFormatting] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { socket, isConnected, sendMessage } = useSocketRoom({ channelId })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    async function fetchUsers() {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (Array.isArray(data)) {
        setUsers(data.filter(user => !user.isAI))
      }
    }
    fetchUsers()
  }, [])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !uploadedFile) || !isConnected || !socket) return;

    const messageContent = content.startsWith('/ai') ? content.replace('/ai', '🤖') : content;

    const messageData = {
      content: messageContent,
      channelId,
      isDM,
      isAICommand: content.startsWith('/ai'),
      ...(uploadedFile && {
        attachment: {
          url: uploadedFile.fileKey,
          type: uploadedFile.fileType,
          name: uploadedFile.fileName
        }
      })
    };

    socket.emit('new_message', messageData);
    setContent('');
    setUploadedFile(null);
    setShowAIFormatting(false);
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    
    // Check for UI formatting
    setShowAIFormatting(shouldShowAIFormatting(newContent))

    // Show suggestions when typing "/ai"
    if (newContent === '/ai') {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
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
            <div className="relative flex-1">
              <textarea
                value={content}
                onChange={handleInputChange}
                placeholder={uploadedFile ? "Add a message (optional)" : "Type a message..."}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  showAIFormatting ? 'font-mono' : ''
                }`}
                disabled={!isConnected || uploadState?.status === 'uploading'}
                rows={1}
              />
              <div className={`absolute top-0 left-0 px-4 py-2 w-full pointer-events-none ${
                showAIFormatting ? 'opacity-100' : 'opacity-0'
              }`}>
                <span className="text-blue-500 font-mono">/ai</span>
                <span className="font-mono">{content.slice(3)}</span>
              </div>
            </div>
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

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute bottom-full left-0 bg-white shadow-lg rounded-md p-2">
          <div className="text-sm text-gray-500 mb-2">Available commands:</div>
          <div className="space-y-1">
            <div className="text-sm">/ai [prompt] - Get AI response</div>
            {users.map(user => (
              <div key={user.id} className="text-sm">
                /ai_{user.name} [prompt] - Get AI response as {user.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 