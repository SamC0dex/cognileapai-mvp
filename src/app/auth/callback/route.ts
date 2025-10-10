import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * OAuth Callback Route Handler
 *
 * Handles the OAuth redirect after Google sign-in.
 * Exchanges the authorization code for a session and redirects the user.
 *
 * @param request - The incoming request with code and optional next parameter
 * @returns Redirect response to dashboard or error page
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'

    // Validate code parameter
    if (!code) {
      console.error('OAuth callback error: Missing authorization code')
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/sign-in?error=missing_code`
      )
    }

    // Validate redirect URL is relative (security check)
    const redirectUrl = next.startsWith('/') ? next : '/dashboard'

    // Create Supabase server client
    const supabase = await createClient()

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error.message)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/sign-in?error=auth_callback_error`
      )
    }

    // Success - redirect to the requested page or dashboard
    return NextResponse.redirect(`${requestUrl.origin}${redirectUrl}`)
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error)
    return NextResponse.redirect(
      `${new URL(request.url).origin}/auth/sign-in?error=auth_callback_error`
    )
  }
}
