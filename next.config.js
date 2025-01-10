/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
      // Ignore Supabase auth calls
      ignoredRoutes: [
        'https://bziaufbnnyxcpcfjszrg.supabase.co/auth/v1/user',
        'https://bziaufbnnyxcpcfjszrg.supabase.co/auth/v1/token'
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