'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

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
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')

  // Calculate password strength
  useEffect(() => {
    if (newPassword.length === 0) {
      setPasswordStrength('weak')
      return
    }

    let strength = 0
    // Length check
    if (newPassword.length >= 8) strength++
    if (newPassword.length >= 12) strength++
    // Contains number
    if (/\d/.test(newPassword)) strength++
    // Contains uppercase and lowercase
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength++
    // Contains special character
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++

    if (strength <= 2) {
      setPasswordStrength('weak')
    } else if (strength <= 4) {
      setPasswordStrength('medium')
    } else {
      setPasswordStrength('strong')
    }
  }, [newPassword])

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

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordsDontMatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  const strengthConfig = {
    weak: {
      color: 'bg-red-500',
      text: 'Weak',
      textColor: 'text-red-600 dark:text-red-400',
      width: '33.33%',
    },
    medium: {
      color: 'bg-amber-500',
      text: 'Medium',
      textColor: 'text-amber-600 dark:text-amber-400',
      width: '66.66%',
    },
    strong: {
      color: 'bg-green-500',
      text: 'Strong',
      textColor: 'text-green-600 dark:text-green-400',
      width: '100%',
    },
  }

  const currentStrength = strengthConfig[passwordStrength]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" style={{ backgroundSize: '32px 32px' }} />

      {/* Content Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-card border border-border/50 p-8 space-y-6">
          {/* Success State */}
          {success ? (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Password Updated!</h1>
                <p className="text-muted-foreground">
                  Your password has been successfully updated.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm">
                <p className="font-medium">
                  Redirecting to sign in page in {countdown} second{countdown !== 1 ? 's' : ''}...
                </p>
              </div>

              <Link
                href="/auth/sign-in"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Continue to Sign In
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Set New Password</h1>
                <p className="text-muted-foreground">
                  Choose a strong password for your account
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{error}</p>
                    {error.includes('expired') && (
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs underline mt-2 inline-block hover:text-destructive/80"
                      >
                        Request a new reset link
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Update Password Form */}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {/* New Password Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium text-foreground"
                  >
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
                      className="w-full px-4 py-3 pl-11 pr-11 rounded-lg border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className={`font-medium ${currentStrength.textColor}`}>
                          {currentStrength.text}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${currentStrength.color} transition-all duration-300`}
                          style={{ width: currentStrength.width }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use 8+ characters with a mix of letters, numbers & symbols
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium text-foreground"
                  >
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
                      className={`w-full px-4 py-3 pl-11 pr-11 rounded-lg border ${
                        passwordsDontMatch
                          ? 'border-destructive focus:ring-destructive/50'
                          : passwordsMatch
                          ? 'border-green-500 focus:ring-green-500/50'
                          : 'border-border focus:ring-primary/50'
                      } bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Match Indicator */}
                  {passwordsMatch && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Passwords match</span>
                    </div>
                  )}
                  {passwordsDontMatch && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span>Passwords do not match</span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || passwordsDontMatch || newPassword.length < 8}
                  className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-glow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Update Password
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">OR</span>
                </div>
              </div>

              {/* Back to Sign In */}
              <div className="text-center">
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Security Note */}
        {!success && (
          <p className="mt-6 text-xs text-center text-muted-foreground/60 max-w-sm mx-auto">
            After updating your password, you&apos;ll be redirected to sign in with your new credentials.
          </p>
        )}
      </div>
    </div>
  )
}
