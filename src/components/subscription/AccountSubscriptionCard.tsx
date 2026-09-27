'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { TRIAL_DAYS } from '@/lib/subscription-tiers'

type Billing = {
  planLabel: string
  priceKr: number
  billedTier: 'free' | 'plus' | 'premium'
  onTrial: boolean
  trialEndsAt: string | null
  checkoutStarted: boolean
  communityAccess: boolean
  subscriptionSource: string | null
  canManageInStripe: boolean
  lifetimeAccess: boolean
}

export default function AccountSubscriptionCard() {
  const [billing, setBilling] = useState<Billing | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createSupabaseClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) {
          if (!cancelled) setError('Log ind for at se abonnementet.')
          return
        }
        const res = await fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Kunne ikke hente abonnement')
        if (!cancelled) setBilling(data as Billing)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Kunne ikke hente abonnement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const openPortal = async () => {
    setOpening(true)
    setError('')
    try {
      const supabase = createSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Log ind igen, og prøv så.')
        return
      }
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ origin: window.location.origin }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.url !== 'string') {
        throw new Error(data.error || 'Kunne ikke åbne abonnementet')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke åbne abonnementet')
      setOpening(false)
    }
  }

  const paid = Boolean(billing && (billing.billedTier !== 'free' || billing.communityAccess || billing.lifetimeAccess))
  const trialDate =
    billing?.onTrial && billing.trialEndsAt
      ? new Date(billing.trialEndsAt).toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
      : null

  return (
    <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center">
          <CreditCard size={22} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Abonnement</h2>
          <p className="text-sm text-gray-500">Se din plan, eller opsig den</p>
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-500">Henter abonnement…</p> : null}

      {!loading && billing && paid ? (
        <div className="space-y-3">
          <p className="text-lg font-semibold text-gray-900">{billing.planLabel}</p>
          {billing.lifetimeAccess ? (
            <p className="text-sm text-gray-600">Livstidsadgang.</p>
          ) : (
            <p className="text-sm text-gray-600">
              {trialDate && billing.subscriptionSource === 'stripe'
                ? `Prøve til ${trialDate}. Derefter ${billing.priceKr} kr pr. måned.`
                : `${billing.priceKr} kr pr. måned.`}
            </p>
          )}
          {billing.subscriptionSource === 'app_store' ? (
            <p className="text-sm text-gray-600">
              Abonnementet er købt i App Store eller Google Play. Det opsiges dér.
            </p>
          ) : null}
          {billing.canManageInStripe ? (
            <button
              type="button"
              onClick={openPortal}
              disabled={opening}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {opening ? 'Åbner…' : 'Administrer eller opsig'}
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && billing && !paid ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-gray-600">
            {billing.checkoutStarted
              ? `Du har ikke et aktivt abonnement. Madplanen åbner, når du starter de ${TRIAL_DAYS} dages prøve. Der trækkes først efter ${TRIAL_DAYS} dage.`
              : `Du har ikke et aktivt abonnement. Uden abonnement er der et begrænset antal madplaner om ugen.`}
          </p>
          <Link
            href="/lav-din-plan"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Start {TRIAL_DAYS} dages prøve
          </Link>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
