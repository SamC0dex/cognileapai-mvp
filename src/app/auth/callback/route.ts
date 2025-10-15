import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Service role client for profile creation (bypasses RLS)
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Trusted hosts for production security (prevents header spoofing)
const ALLOWED_HOSTS = [
  'cognileapai.com',
  'www.cognileapai.com',
  'localhost',
  'localhost:3000',
  'localhost:8080',
]

// Helper to check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development'

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
 * Handles OAuth redirects after Google login and email confirmation.
 * Exchanges authorization code for session and redirects to dashboard.
 * 
 * Security Features:
 * - Validates forwarded headers against allowed hosts
 * - Validates redirect URLs are relative paths only
 * - Emergency profile creation fallback with service role
 * 
 * @param request - The incoming request with code and optional next parameter
 * @returns Redirect response to dashboard or error page
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const nextParam = requestUrl.searchParams.get('next') ?? requestUrl.searchParams.get('redirect')

    // Get proper origin from headers (handles Railway/Vercel proxies)
    // Security: Validate forwarded host against allowed list to prevent header spoofing
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    
    // Validate that forwarded host is trusted
    const isValidHost = forwardedHost && ALLOWED_HOSTS.includes(forwardedHost)
    
    const origin = isValidHost && forwardedProto
      ? `${forwardedProto}://${forwardedHost}`
      : requestUrl.origin

    // Debug logging (development only)
    if (isDevelopment) {
      console.log('Auth Callback Debug:', {
        url: request.url,
        requestOrigin: requestUrl.origin,
        forwardedHost,
        forwardedProto,
        isValidHost,
        computedOrigin: origin,
        nextParam,
      })
    }

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
        console.error('CRITICAL: Database trigger failed to create profile', {
          userId: data.user.id,
          email: data.user.email,
          timestamp: new Date().toISOString(),
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
          console.error('Emergency profile creation failed:', profileError.message)
          // Fail auth flow - user cannot proceed without profile due to RLS
          return NextResponse.redirect(
            `${origin}/auth/login?error=profile_creation_failed`
          )
        } else {
          console.warn('Profile created via emergency fallback (trigger bypassed)')
        }
      }
    }

    // Success - redirect to the requested page or dashboard
    const finalRedirect = `${origin}${redirectUrl}`
    
    if (isDevelopment) {
      console.log('Auth successful, redirecting to:', finalRedirect)
    }
    
    return NextResponse.redirect(finalRedirect)
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error)
    
    // Get origin for error redirect with same validation
    const errorHost = request.headers.get('x-forwarded-host')
    const errorProto = request.headers.get('x-forwarded-proto')
    const isValidErrorHost = errorHost && ALLOWED_HOSTS.includes(errorHost)
    
    const errorOrigin = isValidErrorHost && errorProto
      ? `${errorProto}://${errorHost}`
      : new URL(request.url).origin
      
    return NextResponse.redirect(
      `${errorOrigin}/auth/login?error=auth_callback_error`
    )
  }
}
