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
  'audio/mpeg',
  'video/webm',
  'video/mp4',
  'application/pdf'
];

export async function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    console.error('❌ Upload: Unsupported file type:', file.type);
    throw new Error(`File type ${file.type} not supported. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
  }

  try {
    console.log('📤 Upload: Starting file upload:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

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
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress({
            progress,
            status: 'uploading'
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          onProgress?.({
            progress: 100,
            status: 'completed'
          });
          console.log('✅ Upload: Successfully uploaded file to S3:', fileKey);
          
          resolve({
            fileKey,
            url: uploadUrl,
            fileName: file.name,
            fileType: file.type
          });
        } else {
          console.error('❌ Upload: Failed to upload to S3:', xhr.statusText);
          reject(new Error('S3 upload failed'));
        }
      };

      xhr.onerror = () => {
        onProgress?.({
          progress: 0,
          status: 'error',
          error: 'Upload failed'
        });
        reject(new Error('Network error during upload'));
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

export async function getFileUrl(fileKey: string): Promise<string> {
  const response = await fetch(`/api/presigned-url?fileKey=${encodeURIComponent(fileKey)}`)
  const { url } = await response.json()
  return url
} 