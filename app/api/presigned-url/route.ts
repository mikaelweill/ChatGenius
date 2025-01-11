import { NextResponse } from 'next/server';
import { getPresignedViewUrl } from '@/lib/s3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileKey = searchParams.get('fileKey');

  if (!fileKey) {
    return NextResponse.json({ error: 'File key is required' }, { status: 400 });
  }

  try {
    const url = await getPresignedViewUrl(fileKey);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }
} 