/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true
    }
  },
  serverRuntimeConfig: {
    logging: {
      // Disable logging for /api/activity/ping
      ignoredRoutes: ['/api/activity/ping']
    }
  }
}

module.exports = nextConfig 