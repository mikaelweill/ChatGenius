// Utility for generating user-specific cookie names
export function getAuthCookieName(userId: string | null) {
  return userId ? `sb-session-${userId}` : 'sb-session-default'
}

// Cookie options that match Supabase defaults
export const authCookieOptions = {
  secure: true,
  sameSite: 'lax',
  path: '/'
} as const 