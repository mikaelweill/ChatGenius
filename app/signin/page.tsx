'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { createBrowserClient } from '@/lib/supabase'
import { TokenManager } from '@/lib/tokenManager'

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [showCodeInput, setShowCodeInput] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
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
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
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

      // Use window.location for hard refresh
      window.location.href = '/'

      const handleSignIn = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          TokenManager.setUserId(user.id)  // Store userId when user logs in
        }
      }

    } catch (error) {
      setError("Failed to verify code")
    } finally {
      setIsLoading(false)
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
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-700 text-white placeholder-gray-300 border-gray-600"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
              disabled={isLoading}
              onClick={() => console.log('🖱️ Button clicked')}
            >
              {isLoading ? "Sending code..." : "Get verification code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <Input
                type="text"
                placeholder="Enter verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="bg-gray-700 text-white placeholder-gray-300 border-gray-600"
                maxLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify code"}
            </Button>
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

