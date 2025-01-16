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
  }
} as const;