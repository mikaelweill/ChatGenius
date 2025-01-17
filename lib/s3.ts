import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

// Generate unique file key
const generateFileKey = (fileName: string): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `uploads/${timestamp}-${randomString}-${fileName}`;
};

// Get presigned URL for upload
export async function getPresignedUploadUrl(fileName: string, contentType: string) {
    const fileKey = generateFileKey(fileName);
    
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { uploadUrl, fileKey };
}

// Get presigned URL for viewing/downloading
export async function getPresignedViewUrl(fileKey: string) {
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// Server-side direct upload to S3
export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ fileKey: string }> {
  try {
    const fileKey = generateFileKey(fileName);
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    console.log('✅ S3: Successfully uploaded file:', fileKey);
    
    return { fileKey };
  } catch (error) {
    console.error('❌ S3: Error uploading file:', error);
    throw error;
  }
}

// File type validation
export const allowedFileTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg',
  'audio/webm',
  'video/webm',
  'video/mp4',
  'video/webm;codecs=vp8,opus'
]);

// Increase max file size for videos
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Validate file
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Strip codec info for type checking
  const baseType = file.type.split(';')[0];
  
  if (!allowedFileTypes.has(baseType)) {
    return { 
      isValid: false, 
      error: `File type ${file.type} not supported. Allowed types: ${Array.from(allowedFileTypes).join(', ')}` 
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size exceeds 100MB limit' };
  }
  
  return { isValid: true };
}

// Get human readable file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
} 

console.log('S3 module loaded at:', new Date().toISOString()) 
console.log(123) 