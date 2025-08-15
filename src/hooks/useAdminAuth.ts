'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'

export function useAdminAuth() {
  const { user, session, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const checkingRef = useRef(false)
  const lastCheckRef = useRef<string>('')

  useEffect(() => {
    const checkAdminStatus = async () => {
      // Prevent multiple simultaneous checks
      if (checkingRef.current) {
        console.log('🔒 useAdminAuth: Check already in progress, skipping...')
        return
      }

      // Create a unique key for this check
      const checkKey = `${user?.id}-${session?.access_token?.slice(-10)}-${loading}`
      
      // Skip if we've already checked this exact state
      if (lastCheckRef.current === checkKey) {
        console.log('🔒 useAdminAuth: Already checked this state, skipping...')
        return
      }

      console.log('🔒 useAdminAuth: Starting check...', { 
        hasUser: !!user, 
        hasSession: !!session, 
        loading,
        userId: user?.id 
      })
      
      checkingRef.current = true
      lastCheckRef.current = checkKey
      
      if (loading) {
        console.log('🔒 useAdminAuth: Still loading, waiting...')
        checkingRef.current = false
        return
      }
      
      if (!user || !session) {
        console.log('🔒 useAdminAuth: No user or session, redirecting to login')
        setIsAdmin(false)
        setChecking(false)
        checkingRef.current = false
        router.push('/login')
        return
      }

      try {
        console.log('🔒 useAdminAuth: Checking admin role for user:', user.id)
        
        // Check if user has admin role
        const supabase = createSupabaseClient()
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        console.log('🔒 useAdminAuth: Profile check result:', { 
          profile, 
          error: error?.message,
          hasProfile: !!profile,
          role: profile?.role
        })

        if (error) {
          console.log('🔒 useAdminAuth: Profile error, redirecting to login')
          setIsAdmin(false)
          setChecking(false)
          checkingRef.current = false
          router.push('/login')
          return
        }

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
          console.log('🔒 useAdminAuth: Not admin, redirecting to home. Role:', profile?.role)
          setIsAdmin(false)
          setChecking(false)
          checkingRef.current = false
          router.push('/')
          return
        }

        console.log('🔒 useAdminAuth: Admin access granted!')
        setIsAdmin(true)
        setChecking(false)
      } catch (error) {
        console.error('🔒 useAdminAuth: Error checking admin status:', error)
        setIsAdmin(false)
        setChecking(false)
        checkingRef.current = false
        router.push('/login')
      } finally {
        checkingRef.current = false
      }
    }

    checkAdminStatus()
  }, [user?.id, session?.access_token, loading, router])

  return { isAdmin, checking, user }
}
