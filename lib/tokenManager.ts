// Simple synchronous token storage
export const TokenManager = {
  setToken: (token: string) => {
    try {
      console.log('🔑 Attempting to set token:', { browserType: navigator.userAgent })
      localStorage.setItem('socket_token', token)
      console.log('🔑 Token set successfully')
    } catch (error) {
      console.error('🔑 Error setting token:', error)
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
    try {
      console.log('🔑 Attempting to set userId:', { browserType: navigator.userAgent })
      localStorage.setItem('socket_userId', userId)
      console.log('🔑 UserId set successfully')
    } catch (error) {
      console.error('🔑 Error setting userId:', error)
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