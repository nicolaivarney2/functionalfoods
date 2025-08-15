'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'

export function useAdminAuth() {
  const { user, session, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('🔒 useAdminAuth: Starting check...', { 
        hasUser: !!user, 
        hasSession: !!session, 
        loading,
        userId: user?.id 
      })
      
      if (loading) {
        console.log('🔒 useAdminAuth: Still loading, waiting...')
        return
      }
      
      if (!user || !session) {
        console.log('🔒 useAdminAuth: No user or session, redirecting to login')
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
          router.push('/login')
          return
        }

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
          console.log('🔒 useAdminAuth: Not admin, redirecting to home. Role:', profile?.role)
          router.push('/')
          return
        }

        console.log('🔒 useAdminAuth: Admin access granted!')
        setIsAdmin(true)
      } catch (error) {
        console.error('🔒 useAdminAuth: Error checking admin status:', error)
        router.push('/login')
      } finally {
        setChecking(false)
      }
    }

    checkAdminStatus()
  }, [user, session, loading, router])

  return { isAdmin, checking, user }
}
