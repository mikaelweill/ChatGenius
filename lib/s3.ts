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

// File type validation
export const allowedFileTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

// Max file size (25MB)
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Validate file
export function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!allowedFileTypes.has(file.type)) {
    return { isValid: false, error: 'File type not supported' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size exceeds 25MB limit' };
  }
  
  return { isValid: true };
}

// Get human readable file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
} 