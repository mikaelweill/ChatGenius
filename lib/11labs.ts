import { ElevenLabsClient } from 'elevenlabs';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_LABS_API_KEY || ''
});

interface GenerateParams {
  text: string;
  voice_id?: string;
  model_id?: string;
}

export async function generateElevenLabsSpeech(params: GenerateParams): Promise<Buffer> {
  console.log('🎙️ Starting generation:', {
    text_preview: params.text.slice(0, 50) + '...'
  });

  try {
    // Make direct fetch call to match curl command
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${params.voice_id || 'EXAVITQu4vr4xnSDxMaL'}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVEN_LABS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: params.text,
          model_id: params.model_id || "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    // Get binary audio data directly
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('✅ Audio generated:', { size: buffer.length });
    return buffer;

  } catch (error) {
    console.error('🚨 Generation error:', error);
    throw error;
  }
} 