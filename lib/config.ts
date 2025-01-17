export const config = {
  rag: {
    similarityThreshold: 0.7,
    maxResults: 5,
    minPdfScore: 0.3,
    contextWindow: 3
  },
  did: {
    enabled: true,
    apiUrl: process.env.D_ID_API_URL,
    apiKey: process.env.D_ID_API_KEY,
    maxDuration: 300,
    retryAttempts: 3
  },
  languages: {
    supported: [
      'spanish',
      'french',
      'german',
      'japanese',
      'italian',
      'portuguese',
      'polish',
      'hindi',
      'chinese',
      'korean',
      'arabic'
    ] as const,
    nativeNames: {
      spanish: 'Español',
      french: 'Français',
      german: 'Deutsch',
      japanese: '日本語',
      italian: 'Italiano',
      portuguese: 'Português',
      polish: 'Polski',
      hindi: 'हिन्दी',
      chinese: '中文',
      korean: '한국어',
      arabic: 'العربية'
    },
    aiVoiceId: 'nPczCjzI2devNBz1zQrb'
  }
} as const;

export type SupportedLanguage = typeof config.languages.supported[number];