/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: false
    }
  },
  serverRuntimeConfig: {
    logging: {
      // Disable logging for /api/activity/ping
      ignoredRoutes: ['/api/activity/ping']
    }
  },
  env: {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    PINECONE_NAMESPACE: process.env.PINECONE_NAMESPACE,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }
}

module.exports = nextConfig 