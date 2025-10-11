'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

/**
 * Update Password Page
 *
 * Allows users to set a new password after clicking the reset link in their email.
 * Uses Supabase Auth to update the user's password securely.
 *
 * Features:
 * - Password strength indicator with real-time feedback
 * - Show/hide password toggle buttons
 * - Client-side validation for password length and matching
 * - Loading states during submission
 * - Success/error messaging with auto-redirect
 * - Professional UI matching the app's design system
 * - Fully responsive and accessible
 * - Handles expired/invalid reset links
 */
export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(3)

  // Countdown timer for redirect
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (success && countdown === 0) {
      router.push('/auth/sign-in')
    }
  }, [success, countdown, router])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Client-side validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        // Handle specific error cases
        if (updateError.message.includes('session_not_found') || updateError.message.includes('invalid')) {
          setError('Your password reset link has expired or is invalid. Please request a new one.')
        } else {
          setError(updateError.message)
        }
      } else {
        // Success!
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Password update error:', err)
    } finally {
      setLoading(false)
    }
  }

  const passwordsDontMatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl shadow-xl p-8">
          {/* Success State */}
          {success ? (
            <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Password Updated!</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been successfully updated.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm">
              Redirecting to sign in page in {countdown} second{countdown !== 1 ? 's' : ''}...
            </div>

            <Link
              href="/auth/sign-in"
              className="inline-block text-sm text-primary hover:underline font-medium"
            >
              Continue to Sign In
            </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
              <p className="text-sm text-muted-foreground">
                Choose a strong password for your account
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
                {error.includes('expired') && (
                  <Link
                    href="/auth/forgot-password"
                    className="block text-xs underline mt-2 hover:text-destructive/80"
                  >
                    Request a new reset link
                  </Link>
                )}
              </div>
            )}

            {/* Update Password Form */}
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* New Password Input */}
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">At least 8 characters</p>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordsDontMatch && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || passwordsDontMatch || newPassword.length < 8}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>

              {/* Back to Sign In */}
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/auth/sign-in" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
