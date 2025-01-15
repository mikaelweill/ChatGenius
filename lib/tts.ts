const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const FISH_AUDIO_MODEL_ID = process.env.FISH_AUDIO_MODEL_ID;

// Add immediate logging when module loads
console.log('🔧 TTS Module Loading:', {
  hasApiKey: !!FISH_AUDIO_API_KEY,
  hasModelId: !!FISH_AUDIO_MODEL_ID,
  env: process.env.NODE_ENV
});

export async function generateSpeech(text: string): Promise<Blob | null> {
  try {
    console.log('🎙️ TTS: Starting text-to-speech generation');
    console.log('📝 TTS: Processing text:', text.slice(0, 50) + '...');
    console.log('🎯 TTS: Using reference_id:', FISH_AUDIO_MODEL_ID);

    // Debug environment variables
    if (!FISH_AUDIO_API_KEY) {
      console.error('❌ TTS: Missing API key');
      return null;
    }

    const requestBody = {
      text,
      reference_id: FISH_AUDIO_MODEL_ID,
      output_format: 'mp3'
    };
    console.log('📦 TTS: Request body:', requestBody);

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(requestBody),
    });

    // Debug response in more detail
    console.log('📡 TTS Response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ TTS: Fish.audio API error:', error);
      return null;
    }

    const audioBlob = await response.blob();
    console.log('✅ TTS: Successfully generated audio of size:', audioBlob.size);
    return audioBlob;
  } catch (error) {
    console.error('💥 TTS: Error generating speech:', error);
    return null;
  }
} 