/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
      // Ignore Supabase auth calls
      ignoredRoutes: [
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token`
      ]
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