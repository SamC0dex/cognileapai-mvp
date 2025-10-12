import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isValidRedirect(url: string | null): url is string {
  if (!url) return false
  if (!url.startsWith('/')) return false
  if (url.includes('..')) return false
  if (url.startsWith('//')) return false
  return true
}

/**
 * OAuth Callback Route Handler
 *
 * Handles the OAuth redirect after Google login.
 * Exchanges the authorization code for a session and redirects the user.
 *
 * @param request - The incoming request with code and optional next parameter
 * @returns Redirect response to dashboard or error page
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const nextParam = requestUrl.searchParams.get('next') ?? requestUrl.searchParams.get('redirect')

    // Validate code parameter
    if (!code) {
      console.error('OAuth callback error: Missing authorization code')
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/login?error=missing_code`
      )
    }

    // Validate redirect URL is relative (security check)
    const redirectUrl = isValidRedirect(nextParam) ? nextParam : '/dashboard'

    // Create Supabase server client
    const supabase = await createClient()

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error.message)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/login?error=auth_callback_error`
      )
    }

    // Create profile if it doesn't exist (for new users)
    if (data?.user) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // Get user metadata
        const fullName = data.user.user_metadata?.full_name ||
                        `${data.user.user_metadata?.first_name || ''} ${data.user.user_metadata?.last_name || ''}`.trim() ||
                        data.user.email?.split('@')[0] ||
                        'User'

        const avatarUrl = data.user.user_metadata?.avatar_url || null

        // Create profile
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
          avatar_url: avatarUrl
        })

        console.log('Profile created for user:', data.user.id)
      }
    }

    // Success - redirect to the requested page or dashboard
    return NextResponse.redirect(`${requestUrl.origin}${redirectUrl}`)
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error)
    return NextResponse.redirect(
      `${new URL(request.url).origin}/auth/login?error=auth_callback_error`
    )
  }
}
