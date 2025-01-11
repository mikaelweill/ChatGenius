import { NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/s3';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get file info from request
        const { fileName, contentType } = await request.json();
        
        if (!fileName || !contentType) {
            return NextResponse.json(
                { error: 'fileName and contentType are required' }, 
                { status: 400 }
            );
        }

        // Generate presigned URL
        const { uploadUrl, fileKey } = await getPresignedUploadUrl(fileName, contentType);

        return NextResponse.json({ uploadUrl, fileKey });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' }, 
            { status: 500 }
        );
    }
} 