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
  // Set initial upload state immediately
  onProgress?.({
    progress: 0,
    status: 'uploading'
  });

  if (!ALLOWED_TYPES.includes(file.type)) {
    console.error('❌ Upload: Unsupported file type:', file.type);
    throw new Error(`File type ${file.type} not supported. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
  }

  try {
    console.log('📤 Upload: Starting audio upload:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // 1. Get presigned URL from our API
    onProgress?.({
      progress: 10,
      status: 'uploading'
    });

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
      console.error('❌ Upload: Failed to upload file:', error);
      throw new Error('Upload failed');
    }

    const data = await response.json();
    console.log('✅ Upload: Successfully uploaded file:', data.fileKey);
    console.log('✅ Upload result:', data);
    return {
      fileKey: data.fileKey,
      url: data.fileKey,
      fileName: file.name,
      fileType: file.type
    };
  } catch (error) {
    console.error('💥 Upload: Error uploading file:', error);
    throw error;
  }
}

export async function getFileUrl(fileKey: string): Promise<string> {
  const response = await fetch(`/api/presigned-url?fileKey=${encodeURIComponent(fileKey)}`)
  const { url } = await response.json()
  return url
} 