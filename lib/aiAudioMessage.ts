import { generateSpeech } from './tts';
import { generateElevenLabsSpeech } from './11labs';
import { uploadToS3 } from './s3';
import { prisma } from './prisma';
import { config, type SupportedLanguage } from './config';

interface AIAudioMessageParams {
  content: string;
  aiUserId: string;
  channelId: string;
  isDM: boolean;
  language?: SupportedLanguage;
}

export async function createAIAudioMessage({ 
  content, 
  aiUserId, 
  channelId, 
  isDM,
  language 
}: AIAudioMessageParams) {
  try {
    console.log('🎙️ Starting AI audio generation for:', content.slice(0, 50) + '...');
    
    // Choose TTS service based on aiUserId
    let buffer;
    if (aiUserId === 'AI_SYSTEM') {
      console.log('🤖 Using Eleven Labs for AI_SYSTEM');
      buffer = await generateElevenLabsSpeech({
        text: content,
        voice_id: config.languages.aiVoiceId,
        model_id: language ? 'eleven_multilingual_v2' : 'eleven_turbo_v2'
      });
    } else {
      console.log('🎯 Using Fish.audio for custom AI voice');
      buffer = await generateSpeech(content);
    }
    
    if (!buffer) {
      throw new Error('Failed to generate audio');
    }
    console.log('✅ Audio generated successfully');

    // 3. Upload directly to S3
    console.log('⬆️ Starting S3 upload...');
    const { fileKey } = await uploadToS3(
      buffer,
      'ai-response.mp3',
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