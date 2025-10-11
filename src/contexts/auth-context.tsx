'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { clearAllClientStorage, signOutAndClear } from '@/lib/auth-utils'
import { useRef } from 'react'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Function to clear all app data from localStorage
// Use centralized storage clear from auth-utils

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
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

  const signOut = async () => {
    await signOutAndClear('/')
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
