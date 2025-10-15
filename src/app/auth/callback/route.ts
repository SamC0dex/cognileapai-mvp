import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Service role client for profile creation (bypasses RLS)
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // DEBUG: Log request info to diagnose localhost:8080 issue
    console.log('?? CALLBACK DEBUG:', {
      url: request.url,
      origin: requestUrl.origin,
      host: request.headers.get('host'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      nextParam,
    })

    // Get proper origin from headers (handles Railway/Vercel proxies)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const origin = forwardedHost && forwardedProto
      ? `${forwardedProto}://${forwardedHost}`
      : requestUrl.origin

    console.log('?? USING ORIGIN:', origin)

    // Validate code parameter
    if (!code) {
      console.error('OAuth callback error: Missing authorization code')
      return NextResponse.redirect(
        `${origin}/auth/login?error=missing_code`
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
        `${origin}/auth/login?error=auth_callback_error`
      )
    }

    // Check if profile exists - should be created by database trigger
    // This is a defensive check and emergency fallback ONLY
    if (data?.user) {
      // Wait briefly for trigger to create profile (async operation)
      await new Promise(resolve => setTimeout(resolve, 100))

      const { data: existingProfile } = await serviceSupabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // ALERT: Profile should have been created by trigger!
        console.error('?? CRITICAL: Database trigger failed to create profile!', {
          userId: data.user.id,
          email: data.user.email,
          timestamp: new Date().toISOString(),
          message: 'Trigger on_auth_user_created may be disabled. Check Supabase Dashboard ? Database ? Triggers'
        })

        // Emergency fallback: Create profile manually using service role
        const fullName = data.user.user_metadata?.full_name ||
                        `${data.user.user_metadata?.first_name || ''} ${data.user.user_metadata?.last_name || ''}`.trim() ||
                        data.user.email?.split('@')[0] ||
                        'User'

        const avatarUrl = data.user.user_metadata?.avatar_url || null

        const { error: profileError } = await serviceSupabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
          avatar_url: avatarUrl
        })

        if (profileError) {
          console.error('? Emergency profile creation failed:', profileError.message)
          // Fail auth flow - user cannot proceed without profile due to RLS
          return NextResponse.redirect(
            `${origin}/auth/login?error=profile_creation_failed`
          )
        } else {
          console.warn('?? Profile created via emergency fallback (trigger bypassed)')
        }
      }
    }

    // Success - redirect to the requested page or dashboard
    const finalRedirect = `${origin}${redirectUrl}`
    console.log('? REDIRECTING TO:', finalRedirect)
    return NextResponse.redirect(finalRedirect)
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error)
    const errorHost = request.headers.get('x-forwarded-host')
    const errorProto = request.headers.get('x-forwarded-proto')
    const errorOrigin = errorHost && errorProto
      ? `${errorProto}://${errorHost}`
      : new URL(request.url).origin
    return NextResponse.redirect(
      `${errorOrigin}/auth/login?error=auth_callback_error`
    )
  }
}
