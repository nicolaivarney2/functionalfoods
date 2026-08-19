'use client'

import { useEffect } from 'react'

import { writeStoredReferralCode } from '@/lib/referral-client'
import { normalizeReferralCode } from '@/lib/referral-shared'

/** Gemmer henvisningskode i cookie (landing `/h/[code]` eller `?ref=`). */
export default function ReferralCapture({ code }: { code?: string | null }) {
  useEffect(() => {
    const fromProp = normalizeReferralCode(code)
    if (fromProp) {
      writeStoredReferralCode(fromProp)
      return
    }
    const params = new URLSearchParams(window.location.search)
    const fromQuery = normalizeReferralCode(params.get('ref') || params.get('code'))
    if (fromQuery) writeStoredReferralCode(fromQuery)
  }, [code])

  return null
}
