'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { clearAllClientStorage, logOutAndClear } from '@/lib/auth-utils'
import { useStudyToolsStore } from '@/lib/study-tools-store'
import { useFlashcardStore } from '@/lib/flashcard-store'

interface AuthContextType {
  user: User | null
  loading: boolean
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Function to clear all app data from localStorage
// Use centralized storage clear from auth-utils

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const lastUserIdRef = useRef<string | null>(null)
  const prefetchUserRef = useRef<string | null>(null)
  const userId = user?.id ?? null

  useEffect(() => {
    // Get initial session with error handling
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Handle refresh token errors
        if (error) {
          console.error('[Auth] Session error:', error.message)
          
          // If it's a refresh token error, clear the session
          if (
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token')
          ) {
            console.log('[Auth] Invalid refresh token detected, clearing session')
            await supabase.auth.signOut()
            
            // Redirect to login if on protected route
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
              window.location.href = '/auth/login?error=session_expired'
            }
          }
          
          setUser(null)
          setLoading(false)
          return
        }
        
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (err) {
        console.error('[Auth] Unexpected error getting session:', err)
        setUser(null)
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null
      const prevId = lastUserIdRef.current
      const newId = newUser?.id ?? null

      console.log('[Auth] Auth state changed:', event, 'Previous user:', prevId, 'New user:', newId)

      const switchingAccounts = !!(prevId && newId && prevId !== newId)
      if (event === 'SIGNED_OUT' || switchingAccounts) {
        // Best effort, non-blocking clear
        clearAllClientStorage()
      }

      lastUserIdRef.current = newId
      setUser(newUser)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    const studyToolsStore = useStudyToolsStore.getState()
    const flashcardStore = useFlashcardStore.getState()

    if (!userId) {
      if (!loading) {
        prefetchUserRef.current = null
        studyToolsStore.clearGeneratedContent()
        studyToolsStore.setLastLoadedUserId(null)
        flashcardStore.clearFlashcardSets()
      }
      return
    }

    if (prefetchUserRef.current === userId && studyToolsStore.generatedContent.length > 0) {
      return
    }

    prefetchUserRef.current = userId

    void (async () => {
      try {
        await studyToolsStore.loadStudyToolsFromDatabase()
      } catch (error) {
        console.error('[Auth] Prefetch study tools failed:', error)
      } finally {
        studyToolsStore.setLastLoadedUserId(userId)
      }
    })()
  }, [userId, loading])

  const logOut = async () => {
    await logOutAndClear('/')
  }

  return (
    <AuthContext.Provider value={{ user, loading, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
