'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CreditCard, Loader2, Mail, Search, Smartphone, Users } from 'lucide-react'

import { useAdminAuth } from '@/hooks/useAdminAuth'
import { createSupabaseClient } from '@/lib/supabase'
import {
  cannotCancelReason,
  SUBSCRIPTION_SOURCE_LABELS,
  type SubscriptionSource,
} from '@/lib/subscription-source'
import { TIER_LABELS, type SubscriptionTier } from '@/lib/subscription-tiers'

type StripeLive = {
  id: string
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  canceledAt: string | null
} | null

type Member = {
  id: string
  email: string | null
  name: string | null
  role: string
  createdAt: string | null
  updatedAt: string | null
  tier: SubscriptionTier
  tierLabel: string
  source: SubscriptionSource
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  lastContributionOre: number | null
  lastContributionAt: string | null
  canCancelStripe: boolean
  lifetimeAccess: boolean
  referralCode: string | null
  referralRewardNotifiedAt: string | null
  referredBy: string | null
  stripeLive?: StripeLive
}

type ReferralRow = {
  id: string
  email: string | null
  name: string | null
  createdAt: string | null
  refereeCreatedAt: string | null
}

type Stats = {
  total: number
  plus: number
  premium: number
  free: number
  stripe: number
  storeOrUnknown: number
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function tierBadge(tier: SubscriptionTier) {
  if (tier === 'premium') return 'bg-amber-100 text-amber-900'
  if (tier === 'plus') return 'bg-emerald-100 text-emerald-800'
  return 'bg-gray-100 text-gray-700'
}

function sourceBadge(source: SubscriptionSource) {
  if (source === 'stripe') return 'bg-indigo-100 text-indigo-800'
  if (source === 'app_store') return 'bg-slate-800 text-white'
  if (source === 'manual') return 'bg-purple-100 text-purple-800'
  if (source === 'unknown') return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-600'
}

export default function AdminUsersPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [users, setUsers] = useState<Member[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [tier, setTier] = useState('all')
  const [source, setSource] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(50)
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Member | null>(null)
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        tier,
        source,
      })
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include',
        headers: await authHeaders(),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Kunne ikke hente medlemmer')
      }
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, tier, source, debouncedQ, authHeaders])

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin, loadUsers])

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, tier, source])

  const openMember = async (id: string) => {
    if (openId === id) {
      setOpenId(null)
      setDetail(null)
      return
    }
    setOpenId(id)
    setDetail(null)
    setReferrals([])
    setActionError(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        credentials: 'include',
        headers: await authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kunne ikke hente detaljer')
      setDetail(data.user)
      setReferrals(data.referrals || [])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setDetailLoading(false)
    }
  }

  const patchTier = async (id: string, nextTier: SubscriptionTier) => {
    const labels = { free: 'gratis', plus: 'Madbudget', premium: 'Premium' }
    const ok = window.confirm(
      nextTier === 'free'
        ? 'Sæt medlemmet til gratis? Stripe-knytning fjernes i vores database. App Store-abonnement opsiges ikke.'
        : `Giv ${labels[nextTier]} manuelt? Det overskriver den viste adgang (App Store synces igen næste gang appen åbnes).`
    )
    if (!ok) return

    setBusyId(id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ tier: nextTier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kunne ikke opdatere')
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)))
        setDetail(data.user)
      }
      await loadUsers()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setBusyId(null)
    }
  }

  const patchLifetime = async (id: string, lifetime: boolean) => {
    const ok = window.confirm(
      lifetime
        ? 'Giv Lifetime (Madbudget-adgang + badge)? Tjek at henvisningerne ser ægte ud først.'
        : 'Fjern Lifetime? Hvis adgangen kun var manuel Lifetime, sættes de til gratis.'
    )
    if (!ok) return

    setBusyId(id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ lifetime }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kunne ikke opdatere')
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)))
        setDetail(data.user)
      }
      if (data.referrals) setReferrals(data.referrals)
      await loadUsers()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setBusyId(null)
    }
  }

  const cancelStripe = async (id: string, mode: 'period_end' | 'immediate') => {
    const ok = window.confirm(
      mode === 'immediate'
        ? 'Opsig Stripe-abonnementet med det samme? Adgangen fjernes nu.'
        : 'Opsig Stripe-abonnementet ved periodens udløb? Medlemmet beholder adgang indtil da.'
    )
    if (!ok) return

    setBusyId(id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kunne ikke opsige')
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)))
        setDetail(data.user)
      }
      await loadUsers()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setBusyId(null)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Tjekker admin rettigheder...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medlemmer</h1>
        <p className="mt-2 text-gray-600">
          Overblik over brugere og abonnement. Stripe kan opsiges her. App Store / Play kan kun
          opsiges af brugeren i butikken.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Medlemmer" value={stats.total} icon={<Users className="h-4 w-4" />} />
          <StatCard label="Gratis" value={stats.free} />
          <StatCard label={TIER_LABELS.plus} value={stats.plus} />
          <StatCard label={TIER_LABELS.premium} value={stats.premium} />
          <StatCard
            label="Stripe"
            value={stats.stripe}
            icon={<CreditCard className="h-4 w-4" />}
          />
          <StatCard
            label="Store / ukendt"
            value={stats.storeOrUnknown}
            icon={<Smartphone className="h-4 w-4" />}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg navn, e-mail eller bruger-id"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">Alle niveauer</option>
          <option value="paid">Betalte</option>
          <option value="free">Gratis</option>
          <option value="plus">{TIER_LABELS.plus}</option>
          <option value="premium">{TIER_LABELS.premium}</option>
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">Alle kilder</option>
          <option value="stripe">Stripe (web)</option>
          <option value="app_store">App Store / Play</option>
          <option value="unknown">Ukendt (ikke Stripe)</option>
          <option value="manual">Manuel</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            {loading ? 'Henter…' : `${total} medlemmer`}
          </h2>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">Ingen medlemmer matcher.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {users.map((user) => {
              const open = openId === user.id
              const shown = open && detail?.id === user.id ? detail : user
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => openMember(user.id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-gray-50 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {shown.name || shown.email || shown.id}
                      </p>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Mail className="mr-1 h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate">{shown.email || 'Ingen e-mail i profil'}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tierBadge(shown.tier)}`}
                      >
                        {shown.tierLabel}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceBadge(shown.source)}`}
                      >
                        {SUBSCRIPTION_SOURCE_LABELS[shown.source]}
                      </span>
                      {shown.lifetimeAccess && (
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                          Lifetime
                        </span>
                      )}
                      {shown.referralRewardNotifiedAt && !shown.lifetimeAccess && (
                        <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                          10 henvisninger
                        </span>
                      )}
                      {shown.role !== 'user' && (
                        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {shown.role === 'super_admin' ? 'Super admin' : 'Admin'}
                        </span>
                      )}
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 sm:px-6">
                      {detailLoading && !detail ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Henter Stripe-status…
                        </div>
                      ) : (
                        <MemberDetail
                          user={shown}
                          referrals={open && detail?.id === shown.id ? referrals : []}
                          busy={busyId === shown.id}
                          error={actionError}
                          onCancel={cancelStripe}
                          onSetTier={patchTier}
                          onSetLifetime={patchLifetime}
                        />
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
            <p className="text-sm text-gray-500">
              Side {page} af {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Forrige
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Næste
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon?: ReactNode
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between text-xs font-medium text-gray-500">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function MemberDetail({
  user,
  referrals,
  busy,
  error,
  onCancel,
  onSetTier,
  onSetLifetime,
}: {
  user: Member
  referrals: ReferralRow[]
  busy: boolean
  error: string | null
  onCancel: (id: string, mode: 'period_end' | 'immediate') => void
  onSetTier: (id: string, tier: SubscriptionTier) => void
  onSetLifetime: (id: string, lifetime: boolean) => void
}) {
  const storeBlock = cannotCancelReason(user.source)
  const live = user.stripeLive

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Oprettet" value={formatDate(user.createdAt)} />
        <Field label="Sidst opdateret" value={formatDate(user.updatedAt)} />
        <Field
          label="Sidste beløb"
          value={
            user.lastContributionOre != null
              ? `${Math.round(user.lastContributionOre / 100)} kr`
              : '—'
          }
        />
        <Field label="Stripe customer" value={user.stripeCustomerId || '—'} mono />
        <Field label="Stripe subscription" value={user.stripeSubscriptionId || '—'} mono />
        <Field label="Bruger-id" value={user.id} mono />
        <Field label="Henvisningskode" value={user.referralCode || '—'} mono />
        <Field label="Lifetime" value={user.lifetimeAccess ? 'Ja' : 'Nej'} />
        <Field
          label="Henvisninger"
          value={`${referrals.length}/10${user.referralRewardNotifiedAt ? ' (mail sendt)' : ''}`}
        />
        {live && (
          <>
            <Field label="Stripe-status" value={live.status} />
            <Field
              label="Periode slutter"
              value={
                live.cancelAtPeriodEnd
                  ? `${formatDate(live.currentPeriodEnd)} (opsagt)`
                  : formatDate(live.currentPeriodEnd)
              }
            />
          </>
        )}
      </dl>

      {referrals.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
          <p className="text-xs font-medium text-gray-500">Henviste oprettelser</p>
          <ul className="mt-1 space-y-1 text-sm text-gray-800">
            {referrals.map((r) => (
              <li key={r.id}>
                {r.name || r.email || r.id}
                {r.email && r.name ? ` · ${r.email}` : ''}
                <span className="text-gray-500"> · {formatDate(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {user.stripeCustomerId && (
        <a
          href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm font-medium text-indigo-700 hover:underline"
        >
          Åbn i Stripe Dashboard
        </a>
      )}

      {storeBlock && user.source !== 'stripe' && user.tier !== 'free' && (
        <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
          {storeBlock}
        </p>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {user.canCancelStripe && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancel(user.id, 'period_end')}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Arbejder…' : 'Opsig ved periodens udløb'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancel(user.id, 'immediate')}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
            >
              Opsig med det samme
            </button>
          </>
        )}
        {user.tier !== 'free' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSetTier(user.id, 'free')}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 disabled:opacity-50"
          >
            Sæt til gratis
          </button>
        )}
        {user.tier !== 'plus' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSetTier(user.id, 'plus')}
            className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 disabled:opacity-50"
          >
            Giv Madbudget
          </button>
        )}
        {user.tier !== 'premium' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSetTier(user.id, 'premium')}
            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 disabled:opacity-50"
          >
            Giv Premium
          </button>
        )}
        {!user.lifetimeAccess ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSetLifetime(user.id, true)}
            className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-900 disabled:opacity-50"
          >
            Giv Lifetime
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSetLifetime(user.id, false)}
            className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-900 disabled:opacity-50"
          >
            Fjern Lifetime
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`mt-0.5 break-all text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
