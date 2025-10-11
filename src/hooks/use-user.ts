'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

interface UserWithProfile {
  user: User | null
  profile: Profile | null
  loading: boolean
}

/**
 * Hook to get the authenticated user and their profile
 */
export function useUser(): UserWithProfile {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()

        if (error) {
          console.error('Error fetching user:', error)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        setUser(currentUser)

        // Fetch profile if user exists
        if (currentUser) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          if (profileError) {
            console.error('Error fetching profile:', profileError)
            // Create profile if it doesn't exist
            if (profileError.code === 'PGRST116') {
              const fullName = currentUser.user_metadata?.full_name ||
                              `${currentUser.user_metadata?.first_name || ''} ${currentUser.user_metadata?.last_name || ''}`.trim() ||
                              currentUser.email?.split('@')[0] ||
                              'User'

              const { data: newProfile } = await supabase
                .from('profiles')
                .insert({
                  id: currentUser.id,
                  email: currentUser.email || '',
                  full_name: fullName,
                  avatar_url: currentUser.user_metadata?.avatar_url || null
                })
                .select()
                .single()

              setProfile(newProfile)
            }
          } else {
            setProfile(profileData)
          }
        }
      } catch (error) {
        console.error('Error in useUser:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        // Fetch profile when user signs in
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data))
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, profile, loading }
}
