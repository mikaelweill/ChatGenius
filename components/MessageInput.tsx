'use client'

import { useState, useRef, useEffect } from 'react'
import { useSocketRoom } from '@/hooks/useSocket'
import { FileDropZone } from './FileDropZone'
import { uploadFile } from '@/lib/uploadUtils'
import { eventBus } from '@/lib/eventBus'
import { parseAICommand, shouldShowAIFormatting } from '@/lib/commandParser'
import { Mic, Camera, Paperclip } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'

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
  const [highlightedIndex, setHighlightedIndex] = useState(0);

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

    // Parse the AI command
    const parsedCommand = parseAICommand(content);
    
    const messageData = {
      content: content,
      channelId,
      isDM,
      isAICommand: parsedCommand.isCommand,
      targetUser: parsedCommand.targetUser,
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
    setShowSuggestions(false);
    setHighlightedIndex(0);
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
    
    // Show suggestions when typing /ai or /ai_ followed by any characters
    if (newContent.startsWith('/ai')) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }

    // Check for UI formatting
    setShowAIFormatting(shouldShowAIFormatting(newContent))
  }

  const getFilteredSuggestions = () => {
    if (!content.startsWith('/ai')) return users;
    
    const searchTerm = content.toLowerCase();
    return users.filter(user => {
      const aiCommand = `/ai_${user.name.toLowerCase().replace(/\s+/g, '_')}`;
      return aiCommand.startsWith(searchTerm);
    });
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key for submission
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    if (!showSuggestions) return;
    
    const suggestions = getFilteredSuggestions();
    
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (suggestions.length > 0) {
          const selectedUser = suggestions[highlightedIndex];
          const completion = `/ai_${selectedUser.name.toLowerCase().replace(/\s+/g, '_')} `;
          setContent(completion);
          setHighlightedIndex(0);
          setShowAIFormatting(shouldShowAIFormatting(completion));
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : prev
        );
        break;
    }
  };

  useEffect(() => {
    const unsubscribe = eventBus.onFileDrop((file) => {
      handleFileSelect(file);
    });

    return () => unsubscribe();
  }, []);  // This is fine as is since handleFileSelect is stable

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      // Create a File from the Blob
      const file = new File([audioBlob], 'voice-message.webm', {
        type: 'audio/webm'
      })
      
      // Use the existing file upload logic
      await handleFileSelect(file)
    } catch (error) {
      console.error('Error handling voice recording:', error)
    }
  }

  const handleCameraClick = () => {
    // TODO: Implement camera/video
    console.log('Camera clicked')
  }

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
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <textarea
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
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
                {content.startsWith('/ai_') ? (
                  <>
                    <span className="text-blue-500 font-mono whitespace-pre">
                      {content.match(/^\/ai_[a-zA-Z0-9_]+/)?.[0]}
                    </span>
                    <span className="font-mono whitespace-pre">
                      {content.slice((content.match(/^\/ai_[a-zA-Z0-9_]+/)?.[0] || '').length)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-blue-500 font-mono whitespace-pre">/ai</span>
                    <span className="font-mono whitespace-pre">{content.slice(3)}</span>
                  </>
                )}
              </div>
            </div>

            <VoiceRecorder 
              onRecordingComplete={handleRecordingComplete}
              disabled={uploadState?.status === 'uploading'}
            />

            <button
              type="button"
              onClick={handleCameraClick}
              className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              disabled={uploadState?.status === 'uploading'}
            >
              <Camera className="w-5 h-5" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              onClick={handleFileButtonClick}
              className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              disabled={uploadState?.status === 'uploading' || uploadedFile !== null}
            >
              <Paperclip className="w-5 h-5" />
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
            {content.startsWith('/ai_') || (
              <div className="text-sm">/ai [prompt] - Get AI response</div>
            )}
            {getFilteredSuggestions().map((user, index) => (
              <div 
                key={user.id} 
                className={`text-sm cursor-pointer px-2 py-1 rounded ${
                  index === highlightedIndex ? 'bg-indigo-100' : ''
                }`}
              >
                /ai_{user.name.toLowerCase().replace(/\s+/g, '_')} [prompt] - Get AI response as {user.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 