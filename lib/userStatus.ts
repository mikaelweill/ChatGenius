// Helper function to check if user is online
export function isUserOnline(lastActivityTime: Date) {
  const ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes in milliseconds
  return Date.now() - new Date(lastActivityTime).getTime() < ONLINE_THRESHOLD
} 