'use client'

import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { TokenManager } from '@/lib/tokenManager'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [message, setMessage] = useState('')
  const codeInputs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          channel: 'email',
          type: 'otp'
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      setMessage("Check your email for the verification code")
      setShowCodeInput(true)
    } catch (error) {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1) // Only keep the last character if multiple are pasted
    }

    const newCode = code.split('')
    newCode[index] = value
    setCode(newCode.join(''))

    // Auto-focus next input
    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus() // Move to previous input on backspace
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // First try email verification (for existing users)
      let { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      })

      // If that fails, try signup verification
      if (error?.message?.includes('Invalid token')) {
        const signupResult = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'signup'
        })
        error = signupResult.error
      }

      if (error) {
        setError(error.message)
        return
      }

      // Get session after successful verification
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('Failed to get session')
        return
      }

      // Create user in Prisma after successful verification
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          code: 'VERIFIED'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create user')
      }

      // Store user ID and redirect
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        TokenManager.setUserId(user.id)
      }

      // Use window.location for hard refresh
      window.location.href = '/'

    } catch (error) {
      console.error('Verification error:', error)
      setError("Failed to verify code")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md space-y-8 p-8 bg-gray-800 rounded-lg shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to ChatGenius</h1>
          <p className="text-gray-200 text-lg">Sign in to continue</p>
        </div>

        {!showCodeInput ? (
          <form onSubmit={handleRequestCode} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-center text-lg bg-gray-700 
                         text-white placeholder-gray-300 border-2 border-gray-600 
                         rounded-lg focus:border-blue-500 focus:ring-2 
                         focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-3 px-4 text-sm font-medium text-white 
                       bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 
                       focus:ring-blue-500 transition-colors"
              disabled={loading}
            >
              {loading ? "Sending code..." : "Get verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="flex justify-between gap-2">
              {[...Array(6)].map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  ref={el => codeInputs.current[index] = el}
                  value={code[index] || ''}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-semibold bg-gray-700 
                           text-white border-2 border-gray-600 rounded-lg focus:border-blue-500 
                           focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              ))}
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent 
                       rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 
                       hover:bg-blue-700 focus:outline-none focus:ring-2 
                       focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
            <button
              type="button"
              onClick={() => setShowCodeInput(false)}
              className="w-full text-gray-400 hover:text-white text-sm"
            >
              Back to email
            </button>
          </form>
        )}
        
        {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}
        {message && <p className="text-emerald-400 text-sm font-medium text-center">{message}</p>}
      </div>
    </div>
  )
}

