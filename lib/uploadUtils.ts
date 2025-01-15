interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadResult {
  fileKey: string;
  url: string;
  fileName: string;
  fileType: string;
}

// Add audio MIME types to allowed types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  // Add these lines for audio support
  'audio/webm',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg'
];

export async function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('File type not supported');
  }
  try {
    // 1. Get presigned URL from our API
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const { uploadUrl, fileKey } = await response.json();

    // 2. Upload to S3 with progress tracking
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress({
          progress,
          status: 'uploading'
        });
      }
    };

    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          onProgress?.({
            progress: 100,
            status: 'completed'
          });
          
          resolve({
            fileKey,
            url: uploadUrl,
            fileName: file.name,
            fileType: file.type
          });
        } else {
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => {
        onProgress?.({
          progress: 0,
          status: 'error',
          error: 'Upload failed'
        });
        reject(new Error('Upload failed'));
      };

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  } catch (error) {
    onProgress?.({
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Upload failed'
    });
    throw error;
  }
} 