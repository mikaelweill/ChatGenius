import { generateSpeech } from './tts';
import { uploadToS3 } from './s3';
import { prisma } from './prisma';

interface AIAudioMessageParams {
  content: string;
  aiUserId: string;
  channelId: string;
  isDM: boolean;
}

export async function createAIAudioMessage({ 
  content, 
  aiUserId, 
  channelId, 
  isDM 
}: AIAudioMessageParams) {
  try {
    console.log('🎙️ Starting AI audio generation for:', content.slice(0, 50) + '...');
    
    // 1. Generate audio from text
    const audioBlob = await generateSpeech(content);
    if (!audioBlob) {
      throw new Error('Failed to generate audio');
    }
    console.log('✅ Audio generated successfully');

    // 2. Convert Blob to Buffer for S3 upload
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Upload directly to S3
    console.log('⬆️ Starting S3 upload...');
    const { fileKey } = await uploadToS3(
      buffer,
      'ai-response.mp3',  // Changed to .mp3 since we're getting mp3 from TTS
      'audio/mpeg'
    );
    console.log('✅ File uploaded to S3:', fileKey);

    // 4. Create message with audio attachment
    console.log('💾 Creating message with audio attachment...');
    const message = await prisma.message.create({
      data: {
        content,
        authorId: aiUserId,
        ...(isDM ? { directChatId: channelId } : { channelId }),
        attachments: {
          create: {
            url: fileKey,
            type: 'audio/mpeg',
            name: 'AI Voice Response'
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
    console.log('✅ Audio message created successfully');

    return message;
  } catch (error) {
    console.error('❌ Error creating AI audio message:', error);
    throw error;
  }
} 