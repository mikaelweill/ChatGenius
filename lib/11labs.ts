const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

interface GenerateParams {
  text: string;
  voice_id: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
  };
}

export async function generateElevenLabsSpeech(params: GenerateParams): Promise<Buffer> {
  const response = await fetch(
    `${ELEVEN_LABS_API_URL}/text-to-speech/${params.voice_id}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVEN_LABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        model_id: params.model_id || 'eleven_turbo_v2',
        voice_settings: params.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.75
        }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Eleven Labs API error: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
} 