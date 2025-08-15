'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<any>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Only initialize once
    if (initializedRef.current) {
      return
    }
    
    initializedRef.current = true
    
    // Create a single Supabase client instance
    const supabase = createSupabaseClient()
    supabaseRef.current = supabase

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      initializedRef.current = false
    }
  }, [])

  // Handle redirect after email verification
  useEffect(() => {
    const handleRedirect = () => {
      const savedUrl = localStorage.getItem('auth_redirect_url')
      if (savedUrl && user) {
        localStorage.removeItem('auth_redirect_url')
        // Use router.push if available, otherwise window.location
        if (typeof window !== 'undefined') {
          window.location.href = savedUrl
        }
      }
    }

    if (user) {
      handleRedirect()
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    const supabase = supabaseRef.current || createSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, name: string) => {
    // Save current URL before signup
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_redirect_url', window.location.href)
    }

    const supabase = supabaseRef.current || createSupabaseClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
    return { error }
  }

  const signOut = async () => {
    const supabase = supabaseRef.current || createSupabaseClient()
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 