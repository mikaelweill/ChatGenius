import { NextResponse } from 'next/server';
import { getPresignedUploadUrl, validateFile } from '@/lib/s3';
import { cookies } from 'next/headers';
import { getAPIUser } from '@/lib/auth';

// Define constants but don't export them
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'audio/webm',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'video/webm',
  'video/mp4'
];

// Keep this as a constant, not exported
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: Request) {
    try {
        const cookieStore = cookies()
        const { user, error } = await getAPIUser(() => cookieStore)
        
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileName, contentType, fileSize } = await request.json();
        
        // Use the constants in the validation
        if (!fileName || !contentType || !fileSize) {
            return NextResponse.json(
                { error: 'Missing required fields: fileName, contentType, or fileSize' }, 
                { status: 400 }
            );
        }

        if (!ALLOWED_TYPES.includes(contentType)) {
            return NextResponse.json(
                { error: `File type ${contentType} not supported. Allowed types: ${ALLOWED_TYPES.join(', ')}` },
                { status: 400 }
            );
        }

        if (fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File size ${fileSize} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes` },
                { status: 400 }
            );
        }

        // Validate file type and size
        const validation = validateFile({ type: contentType, size: fileSize } as File);
        if (!validation.isValid) {
            return NextResponse.json(
                { error: validation.error }, 
                { status: 400 }
            );
        }

        // Generate presigned URL
        const { uploadUrl, fileKey } = await getPresignedUploadUrl(fileName, contentType);

        return NextResponse.json({ 
            uploadUrl, 
            fileKey,
            maxSize: MAX_FILE_SIZE,
            allowedTypes: Array.from(ALLOWED_TYPES),
            expiresIn: 3600 // URL expiration in seconds
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}

// Return allowed file types and size limits
export async function GET() {
    return NextResponse.json({
        maxSize: MAX_FILE_SIZE,
        allowedTypes: Array.from(ALLOWED_TYPES)
    });
} 