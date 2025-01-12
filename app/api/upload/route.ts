import { NextResponse } from 'next/server';
import { getPresignedUploadUrl, validateFile, allowedFileTypes, MAX_FILE_SIZE } from '@/lib/s3';
import { cookies } from 'next/headers';
import { getAPIUser } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const cookieStore = cookies()
        const { user, error } = await getAPIUser(() => cookieStore)
        
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get file info from request
        const { fileName, contentType, fileSize } = await request.json();
        
        if (!fileName || !contentType || !fileSize) {
            return NextResponse.json(
                { error: 'fileName, contentType, and fileSize are required' }, 
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
            allowedTypes: Array.from(allowedFileTypes),
            expiresIn: 3600 // URL expiration in seconds
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' }, 
            { status: 500 }
        );
    }
}

// Return allowed file types and size limits
export async function GET() {
    return NextResponse.json({
        maxSize: MAX_FILE_SIZE,
        allowedTypes: Array.from(allowedFileTypes)
    });
} 