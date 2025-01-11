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