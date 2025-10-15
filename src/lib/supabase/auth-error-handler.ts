/**
 * Authentication Error Handler
 * 
 * Handles authentication errors gracefully, including:
 * - Invalid refresh tokens
 * - Expired sessions
 * - Missing session data
 */

import { createClient } from './client'

/**
 * Clear all authentication data and redirect to login
 */
export async function clearAuthAndRedirect(
  redirectUrl: string = '/auth/login',
  errorMessage?: string
) {
  try {
    const supabase = createClient()
    
    // Sign out to clear all tokens
    await supabase.auth.signOut()
    
    // Build redirect URL with error message
    const url = new URL(redirectUrl, window.location.origin)
    if (errorMessage) {
      url.searchParams.set('error', errorMessage)
    }
    
    // Redirect to login
    window.location.href = url.toString()
  } catch (error) {
    console.error('Error clearing auth:', error)
    // Force redirect even if sign out fails
    window.location.href = redirectUrl
  }
}

/**
 * Check session validity and handle errors
 */
export async function validateSession() {
  try {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      // Check for refresh token errors
      if (
        error.message.includes('refresh_token_not_found') ||
        error.message.includes('Invalid Refresh Token')
      ) {
        console.error('Refresh token error detected, clearing session')
        await clearAuthAndRedirect('/auth/login', 'session_expired')
        return null
      }
      
      console.error('Session validation error:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Unexpected session validation error:', error)
    return null
  }
}

/**
 * Initialize auth error monitoring
 * Call this in your app layout to handle auth errors globally
 */
export function initAuthErrorMonitoring() {
  if (typeof window === 'undefined') return
  
  const supabase = createClient()
  
  // Monitor auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event) => {
      console.log('Auth state change:', event)
      
      if (event === 'SIGNED_OUT') {
        // User was signed out, redirect to login if on protected route
        if (window.location.pathname.startsWith('/dashboard')) {
          window.location.href = '/auth/login?error=session_expired'
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      }
    }
  )
  
  // Return cleanup function
  return () => {
    subscription.unsubscribe()
  }
}
