'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  Button
} from '@/components/ui'

interface EmailVerificationDialogProps {
  email: string
  open: boolean
  onClose: () => void
}

/**
 * Email Verification Dialog Component
 * 
 * Displays a professional modal after account creation with:
 * - Clear verification instructions
 * - Email resend functionality
 * - Status feedback (success/error)
 * - Consistent theming with the application
 */
export function EmailVerificationDialog({ email, open, onClose }: EmailVerificationDialogProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const supabase = createClient()

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendStatus('idle')
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`
        }
      })

      if (error) {
        setResendStatus('error')
        setErrorMessage(error.message)
      } else {
        setResendStatus('success')
      }
    } catch {
      setResendStatus('error')
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            Verify Your Email
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3 pt-2">
            <p className="text-base text-foreground">
              We&apos;ve sent a confirmation link to:
            </p>
            <p className="font-semibold text-primary break-all px-2">
              {email}
            </p>
            <div className="pt-2 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the confirmation link we sent</li>
                <li>You&apos;ll be automatically redirected to your dashboard</li>
              </ol>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Resend Status Messages */}
        {resendStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>Confirmation email sent successfully!</span>
          </div>
        )}

        {resendStatus === 'error' && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage || 'Failed to resend email. Please try again.'}</span>
          </div>
        )}

        <AlertDialogFooter className="flex-col sm:flex-col space-y-2">
          <Button
            onClick={handleResendEmail}
            disabled={isResending || resendStatus === 'success'}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resendStatus === 'success' ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Email Sent
              </>
            ) : (
              'Resend Confirmation Email'
            )}
          </Button>
          <AlertDialogAction onClick={onClose} className="w-full">
            Got It
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
