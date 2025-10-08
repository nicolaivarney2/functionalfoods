'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'

export function useAdminCheck() {
  const { user, session, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const checkingRef = useRef(false)
  const lastCheckRef = useRef<string>('')

  useEffect(() => {
    const checkAdminStatus = async () => {
      // Prevent multiple simultaneous checks
      if (checkingRef.current) {
        console.log('🔒 useAdminCheck: Check already in progress, skipping...')
        return
      }

      // Create a unique key for this check
      const checkKey = `${user?.id}-${loading}`
      
      // Skip if we've already checked this exact state
      if (lastCheckRef.current === checkKey) {
        console.log('🔒 useAdminCheck: Already checked this state, skipping...')
        return
      }

      console.log('🔒 useAdminCheck: Starting check...', { 
        hasUser: !!user, 
        loading,
        userId: user?.id 
      })
      
      checkingRef.current = true
      lastCheckRef.current = checkKey
      
      if (loading) {
        console.log('🔒 useAdminCheck: Still loading, waiting...')
        checkingRef.current = false
        return
      }
      
      if (!user) {
        console.log('🔒 useAdminCheck: No user, not admin')
        setIsAdmin(false)
        setChecking(false)
        checkingRef.current = false
        return
      }

      try {
        console.log('🔒 useAdminCheck: Checking admin role for user:', user.id)
        
        // Check if user has admin role
        const supabase = createSupabaseClient()
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        console.log('🔒 useAdminCheck: Profile check result:', { 
          profile, 
          error: error?.message,
          hasProfile: !!profile,
          role: profile?.role
        })

        if (error) {
          console.log('🔒 useAdminCheck: Profile error, not admin')
          setIsAdmin(false)
          setChecking(false)
          checkingRef.current = false
          return
        }

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
          console.log('🔒 useAdminCheck: Not admin. Role:', profile?.role)
          setIsAdmin(false)
          setChecking(false)
          checkingRef.current = false
          return
        }

        console.log('🔒 useAdminCheck: Admin access confirmed!')
        setIsAdmin(true)
        setChecking(false)
      } catch (error) {
        console.error('🔒 useAdminCheck: Error checking admin status:', error)
        setIsAdmin(false)
        setChecking(false)
        checkingRef.current = false
      } finally {
        checkingRef.current = false
      }
    }

    checkAdminStatus()
  }, [user?.id, loading])

  return { isAdmin, checking, user }
}
