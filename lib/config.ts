export const config = {
  rag: {
    similarityThreshold: 0.7,
    maxResults: 5,
    minPdfScore: 0.3,
    contextWindow: 3
  },
  // other config sections
} as const; 