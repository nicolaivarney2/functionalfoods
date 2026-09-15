'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Users } from 'lucide-react'

type InviteInfo = { email: string; inviterName: string }

export default function PartnerInvitePage() {
  const params = useParams<{ token: string }>()
  const token = params?.token || ''
  const { user, loading: authLoading, signIn, signOut } = useAuth()

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const autoAcceptTried = useRef(false)

  useEffect(() => {
    if (!token) return
    let alive = true
    fetch(`/api/household/invite/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'Invitationen kunne ikke indlæses.')
        return body as InviteInfo
      })
      .then((data) => {
        if (alive) setInfo(data)
      })
      .catch((e: Error) => {
        if (alive) setLoadError(e.message)
      })
    return () => {
      alive = false
    }
  }, [token])

  async function accept() {
    const res = await fetch('/api/household/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Kunne ikke acceptere invitationen.')
    setDone(true)
  }

  useEffect(() => {
    if (!user || !info || done || authLoading || autoAcceptTried.current) return
    autoAcceptTried.current = true
    setSubmitting(true)
    accept()
      .catch((e: Error) => setError(e.message))
      .finally(() => setSubmitting(false))
  }, [user, info, done, authLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!info) return
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/household/partner-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email, password, name }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'Kunne ikke oprette kontoen.')
        const { error: signError } = await signIn(email.trim(), password)
        if (signError) throw new Error(signError.message)
        setDone(true)
        return
      }
      const { error: signError } = await signIn(email.trim(), password)
      if (signError) throw new Error(signError.message)
      await accept()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der opstod en fejl.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[70vh] bg-slate-50 text-gray-800">
      <section className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto max-w-lg px-4 py-12 sm:py-16">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <Users className="h-6 w-6" />
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
            Partner
          </p>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
            I skal dele madplanen
          </h1>
          {loadError ? (
            <p className="text-gray-600">{loadError}</p>
          ) : !info ? (
            <p className="text-gray-600">Henter invitation…</p>
          ) : done ? (
            <div className="space-y-4">
              <p>
                Du er nu partner-bruger til {info.inviterName}. I kan redigere i samme madplan, men
                har hver jeres madlog.
              </p>
              <p className="text-sm text-gray-500">
                Fortsæt i appen eller på{' '}
                <Link href="/madbudget" className="text-emerald-800 underline">
                  functionalfoods.dk/madbudget
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-gray-700">
                {info.inviterName} har inviteret dig. Opret dit eget login her — du behøver ikke
                vente på en bekræftelsesmail.
              </p>
              {user ? (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  Du er logget ind som {user.email}.{' '}
                  <button type="button" className="underline" onClick={() => signOut()}>
                    Log ud
                  </button>{' '}
                  hvis du vil oprette en ny partner-konto.
                </div>
              ) : null}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3"
                    autoComplete="email"
                    required
                  />
                </div>
                {mode === 'signup' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Dit navn</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3"
                      autoComplete="name"
                    />
                  </div>
                ) : null}
                <div>
                  <label className="mb-1 block text-sm font-medium">Adgangskode</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button
                  type="submit"
                  disabled={submitting || authLoading || Boolean(user)}
                  className="w-full rounded-xl bg-emerald-700 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {submitting
                    ? 'Et øjeblik…'
                    : mode === 'signup'
                      ? 'Opret og del madplanen'
                      : 'Log ind og del madplanen'}
                </button>
              </form>
              <button
                type="button"
                className="mt-4 text-sm text-emerald-800 underline"
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              >
                {mode === 'signup' ? 'Har du allerede konto? Log ind' : 'Ny her? Opret konto'}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
