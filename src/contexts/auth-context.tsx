'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Function to clear all app data from localStorage
function clearAllAppData() {
  console.log('[Auth] Clearing all app data from localStorage')

  // List of all localStorage keys used by the app
  const appKeys = [
    'study-tools-storage',  // Study tools store
    'flashcard-storage',    // Flashcard store
    'chat-storage',         // Chat store
    'cognileap:threads',    // Chat history
    // Add any other localStorage keys your app uses
  ]

  appKeys.forEach(key => {
    try {
      localStorage.removeItem(key)
      console.log(`[Auth] Removed localStorage key: ${key}`)
    } catch (error) {
      console.warn(`[Auth] Failed to remove key ${key}:`, error)
    }
  })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const previousUser = user
      const newUser = session?.user ?? null

      console.log('[Auth] Auth state changed:', event, 'Previous user:', previousUser?.id, 'New user:', newUser?.id)

      // Clear localStorage when:
      // 1. User signs out (SIGNED_OUT event)
      // 2. User switches accounts (different user IDs)
      if (event === 'SIGNED_OUT' || (previousUser && newUser && previousUser.id !== newUser.id)) {
        console.log('[Auth] Clearing app data due to auth state change')
        clearAllAppData()
      }

      // Also clear when signing out but before session is null
      if (event === 'SIGNED_OUT' || !newUser) {
        clearAllAppData()
      }

      setUser(newUser)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    console.log('[Auth] Signing out user')
    // Clear data before signing out
    clearAllAppData()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
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
