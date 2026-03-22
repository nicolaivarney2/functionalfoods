'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase'

export type SignUpResult = { error: AuthError | null; session: Session | null }

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string, captchaToken?: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<any>(null)
  const initializedRef = useRef(false)

  const clearLocalAuthState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('functionalfoods-auth')
      localStorage.removeItem('auth_redirect_url')
    }
  }

  useEffect(() => {
    // Only initialize once
    if (initializedRef.current) {
      return
    }
    
    initializedRef.current = true
    
    // Create a single Supabase client instance
    const supabase = createSupabaseClient()
    supabaseRef.current = supabase

    // Get initial session – altid afslut loading (ellers hænger sider der venter på auth)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
      })
      .catch(async (err) => {
        console.error('Supabase getSession failed:', err)
        const message = String((err as { message?: string })?.message || '')
        if (message.includes('Invalid Refresh Token') || message.includes('Refresh Token Not Found')) {
          clearLocalAuthState()
          try {
            await supabase.auth.signOut({ scope: 'local' })
          } catch {
            // ignore cleanup failures
          }
          setSession(null)
          setUser(null)
        }
      })
      .finally(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearLocalAuthState()
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      initializedRef.current = false
    }
  }, [])

  // Handle redirect after email verification (undgå reload til samme side – ødelægger signup → Stripe)
  useEffect(() => {
    const handleRedirect = () => {
      const savedUrl = localStorage.getItem('auth_redirect_url')
      if (!savedUrl || !user) return
      localStorage.removeItem('auth_redirect_url')
      if (typeof window === 'undefined') return
      const current = window.location.href.split('#')[0]
      const target = savedUrl.split('#')[0]
      if (current === target) return
      window.location.href = savedUrl
    }

    if (user) {
      handleRedirect()
    }
  }, [user])

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    // Undgå at gammel signup-gemt URL fra localStorage laver fuld redirect efter almindeligt login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_redirect_url')
      // Hvis en korrupt refresh-token ligger gemt, så start login fra ren auth-state.
      localStorage.removeItem('functionalfoods-auth')
    }
    const supabase = supabaseRef.current || createSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    })
    return { error }
  }

  const signUp = async (email: string, password: string, name: string, captchaToken?: string): Promise<SignUpResult> => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_redirect_url', window.location.href)
    }

    const supabase = supabaseRef.current || createSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    return { error, session: data.session ?? null }
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