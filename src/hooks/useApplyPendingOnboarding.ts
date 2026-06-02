'use client'

import { useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { applyPendingOnboarding, hasPendingOnboardingData } from '@/lib/onboarding/vaegttabsplan-onboarding'

/**
 * Efter login: gem profil fra onboarding-wizard (localStorage) til databasen.
 * Kalder onApplied én gang når data er overført.
 */
export function useApplyPendingOnboarding(isGuest: boolean, onApplied?: () => void) {
  const appliedRef = useRef(false)

  useEffect(() => {
    if (isGuest || appliedRef.current) return

    let cancelled = false
    ;(async () => {
      if (!hasPendingOnboardingData()) return
      try {
        const supabase = createSupabaseClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session || cancelled) return

        const ok = await applyPendingOnboarding(session.access_token)
        if (ok && !cancelled) {
          appliedRef.current = true
          onApplied?.()
        }
      } catch (err) {
        console.error('useApplyPendingOnboarding', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isGuest, onApplied])
}
