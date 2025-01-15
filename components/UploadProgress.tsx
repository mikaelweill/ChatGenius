interface UploadProgressProps {
  progress: number
  status: 'uploading' | 'completed' | 'error'
  fileName: string
  error?: string
}

export function UploadProgress({ progress, status, fileName, error }: UploadProgressProps) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {status === 'uploading' ? 'Uploading...' : status === 'error' ? 'Error' : 'Completed'}: {fileName}
        </span>
        <span className="text-sm text-gray-500">
          {progress}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ${
            status === 'error' 
              ? 'bg-red-500' 
              : status === 'completed'
                ? 'bg-green-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
} 