// Simple synchronous token storage
export const TokenManager = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('socket_token', token)
    }
  },
  
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('socket_token')
    }
    return null
  },
  
  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('socket_token')
    }
  },

  // Add these new methods for userId
  setUserId: (userId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('socket_userId', userId)
    }
  },
  
  getUserId: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('socket_userId')
    }
    return null
  },
  
  removeUserId: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('socket_userId')
    }
  }
} 