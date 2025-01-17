import { config } from './config'
import { prisma } from './prisma'
import { uploadToS3, getPresignedViewUrl } from './s3'

interface ScriptConfig {
  type: 'text' | 'audio';
  audio_url?: string;
}

interface TalkConfig {
  stitch?: boolean;
}

interface CreateTalkRequest {
  source_url: string;
  script: ScriptConfig;
  config?: TalkConfig;
}

interface TalkResponse {
  id: string;
  status: 'created' | 'started' | 'done' | 'error';
  result_url?: string;
}

export class DIDClient {
  constructor(
    private readonly apiKey: string = process.env.D_ID_API_KEY || '',
    private readonly apiUrl: string = process.env.D_ID_API_URL || 'https://api.d-id.com'
  ) {
    if (!this.apiKey) throw new Error('D-ID API key is required');
  }

  async createTalk(params: CreateTalkRequest): Promise<TalkResponse> {
    const response = await fetch(`${this.apiUrl}/talks`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`D-ID API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Helper method for our common use case
  async createAudioTalk(imageUrl: string, audioUrl: string): Promise<TalkResponse> {
    return this.createTalk({
      source_url: imageUrl,
      script: {
        type: 'audio',
        audio_url: audioUrl
      },
      config: {
        stitch: true  // Keep full image context
      }
    });
  }

  async getTalkStatus(talkId: string): Promise<TalkResponse> {
    const response = await fetch(`${this.apiUrl}/talks/${talkId}`, {
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`D-ID API error: ${response.statusText}`);
    }

    return response.json();
  }
}

interface CreateDIDAudioMessageParams {
  content: string;
  aiUserId: string;
  channelId: string;
  isDM: boolean;
  imageUrl: string;
  audioUrl: string;
  audioMessageId?: string;
}

export async function createDIDVideoMessage({
  content,
  aiUserId,
  channelId,
  isDM,
  imageUrl,
  audioUrl,
  audioMessageId
}: CreateDIDAudioMessageParams) {
  try {
    console.log('🎬 D-ID Flow Started:', {
      aiUserId,
      channelId,
      isDM,
      contentPreview: content.slice(0, 50) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Get presigned URLs for D-ID
    console.log('🔐 Generating presigned URLs...');
    const [imagePresignedUrl, audioPresignedUrl] = await Promise.all([
      getPresignedViewUrl(imageUrl),
      getPresignedViewUrl(audioUrl)
    ]);
    
    // 1. Create D-ID talk
    const didClient = new DIDClient();
    console.log('📤 Sending to D-ID API...', {
      imagePresignedUrl,
      audioPresignedUrl,
      timestamp: new Date().toISOString()
    });
    const talk = await didClient.createAudioTalk(imagePresignedUrl, audioPresignedUrl);
    console.log('✅ D-ID Talk Created:', { 
      talkId: talk.id,
      status: talk.status,
      timestamp: new Date().toISOString()
    });
    
    // 2. Wait for video to be ready
    let videoResult = await didClient.getTalkStatus(talk.id);
    console.log('⏳ Waiting for video generation...', {
      talkId: talk.id,
      initialStatus: videoResult.status,
      timestamp: new Date().toISOString()
    });

    while (videoResult.status !== 'done' && videoResult.status !== 'error') {
      console.log('🔄 Video Status:', {
        talkId: talk.id,
        status: videoResult.status,
        timestamp: new Date().toISOString()
      });
      await new Promise(r => setTimeout(r, 1000));
      videoResult = await didClient.getTalkStatus(talk.id);
    }
    
    if (videoResult.status !== 'done' || !videoResult.result_url) {
      console.error('❌ Video Generation Failed:', {
        talkId: talk.id,
        finalStatus: videoResult.status,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to generate video');
    }
    
    console.log('🎥 Video Generated Successfully:', {
      talkId: talk.id,
      resultUrl: videoResult.result_url,
      timestamp: new Date().toISOString()
    });
    
    // Download video from D-ID and upload to S3
    console.log('⬇️ Downloading video from D-ID...');
    const videoResponse = await fetch(videoResult.result_url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    
    console.log('⬆️ Uploading video to S3...');
    const { fileKey } = await uploadToS3(
      videoBuffer,
      `did-video-${talk.id}.mp4`,
      'video/mp4'
    );

    // Create message with video attachment
    console.log('💾 Creating message with video attachment...');
    const message = await prisma.message.create({
      data: {
        content,
        authorId: aiUserId,
        ...(isDM ? { directChatId: channelId } : { channelId }),
        attachments: {
          create: {
            url: fileKey,
            type: 'video/mp4',
            name: `did-video-${talk.id}.mp4`
          }
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          }
        },
        attachments: true
      }
    });

    // Delete the audio message since video was successful
    if (audioMessageId) {
      try {
        console.log('��️ Cleaning up audio message and attachments:', audioMessageId);
        
        // First delete attachments
        await prisma.attachment.deleteMany({
          where: { messageId: audioMessageId }
        });
        
        // Then delete the message
        await prisma.message.delete({
          where: { id: audioMessageId }
        });
        
        console.log('✅ Successfully cleaned up audio message');
      } catch (error) {
        console.error('❌ Failed to clean up audio message:', error);
        // Don't throw - we still want to return the video message even if cleanup fails
      }
    }

    return message;
    
  } catch (error) {
    console.error('❌ D-ID Flow Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params: {
        aiUserId,
        channelId,
        isDM,
        contentPreview: content.slice(0, 50) + '...'
      },
      timestamp: new Date().toISOString()
    });
    throw error;
  }
} 