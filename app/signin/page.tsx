'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  const emailInputRef = useRef<HTMLInputElement>(null)
  const [lastCodeSentAt, setLastCodeSentAt] = useState<Date | null>(null)

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (showCodeInput && codeInputs.current[0]) {
      codeInputs.current[0].focus()
    }
  }, [showCodeInput])

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const { error } = await supabase().auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            email
          }
        }
      })

      if (error) {
        if (error.message.includes('can only request this after')) {
          setShowCodeInput(true)
          setMessage("Please use the code we sent you earlier")
          return
        }
        setError(error.message)
        return
      }

      setLastCodeSentAt(new Date())
      setShowCodeInput(true)
      setMessage("Check your email for the verification code")
      setCode('')
    } catch (error) {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1)
    }

    const newCode = code.split('')
    newCode[index] = value
    const updatedCode = newCode.join('')
    setCode(updatedCode)

    // Auto-focus next input
    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus()
    }

    // Auto-submit with the complete code
    if (index === 5 && value && updatedCode.length === 6) {
      setTimeout(() => {
        const e = new Event('submit') as any
        e.preventDefault = () => {} // Add preventDefault to match form event
        handleVerifyCode(e, updatedCode) // Pass the complete code
      }, 300) // Increased delay
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus() // Move to previous input on backspace
    }
  }

  const handleVerifyCode = async (e: React.FormEvent, directCode?: string) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const codeToVerify = directCode || code // Use direct code if provided

    try {
      // First try email verification (for existing users)
      let { error } = await supabase().auth.verifyOtp({
        email,
        token: codeToVerify,
        type: 'email'
      })

      // If that fails, try signup verification
      if (error?.message?.includes('Invalid token')) {
        const signupResult = await supabase().auth.verifyOtp({
          email,
          token: codeToVerify,
          type: 'signup'
        })
        error = signupResult.error
      }

      if (error) {
        setError(error.message)
        return
      }

      // Get session after successful verification
      const { data: { session } } = await supabase().auth.getSession()
      
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
      const { data: { user } } = await supabase().auth.getUser()
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

  const handleBackToEmail = () => {
    setShowCodeInput(false)
    // Clear states
    setCode('')
    setError('')
    setMessage('')
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
                ref={emailInputRef}
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
                  ref={(el: HTMLInputElement | null) => {
                    codeInputs.current[index] = el
                    return undefined
                  }}
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
              onClick={handleBackToEmail}
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

