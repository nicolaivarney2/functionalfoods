'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Lock,
  Sparkles,
  ShoppingBasket,
  Users,
  Scale,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAnalytics } from '@/components/AnalyticsProvider'

const PRESETS = [
  { kr: 0, label: '0 kr' },
  { kr: 60, label: '60 kr' },
  { kr: 100, label: '100 kr' },
  { kr: 200, label: '200 kr' },
] as const

/** Skærmbilleder fra funktionerne – samme assets som på /funktioner */
const FEM_GRUNDE = [
  {
    focus: 'Fokus 1 · Vægttab',
    title: 'Vægttab uden gætteri',
    text: 'Struktur og kalorier, der matcher dit liv. Du ved, hvad du skal spise - ikke bare hvad der er "sundt".',
    image: '/billeder/funktioner/functionalfoods-vaegttabsrejse.png',
    alt: 'Vægttabsrejse og personlig plan i Functional Foods',
    imageFirst: false,
    highlight: false,
  },
  {
    focus: 'Fokus 2 · Tilbud',
    title: 'Tilbud der betyder noget på tallerkenen',
    text: 'Planerne bygger på aktuelle tilbud hos Netto, REMA, Bilka m.fl. Mindre budget-stress. Mere madplan.',
    image: '/billeder/funktioner/functionalfoods-madplaner-ud-fra-tilbud.png',
    alt: 'Madplaner ud fra tilbud i dagligvarebutikkerne',
    imageFirst: true,
    highlight: false,
  },
  {
    focus: 'Fokus 3 · Personlig plan',
    title: 'Din familie. Din smag. Én plan.',
    text: 'Alder, vægt, energibehov og favoritter samlet ét sted. Ikke tre apps. Ikke tre lister.',
    image: '/billeder/funktioner/functionalfoods-madbudget-1.png',
    alt: 'Madbudget med personlig ugeplan',
    imageFirst: false,
    highlight: false,
  },
  {
    focus: 'Fokus 4 · Fleksibilitet',
    title: 'Ny uge? Ny plan. Få klik.',
    text: 'Tilbud skifter. Behov skifter. Lav en ny madplan uden at starte fra nul hver gang.',
    image: '/billeder/funktioner/functionalfoods-madbudget-2.png',
    alt: 'Dynamisk madbudget og ugeplan',
    imageFirst: true,
    highlight: false,
  },
  {
    focus: 'Fokus 5 · Tryghed',
    title: 'Bygget i Danmark – til dansk hverdag',
    text: 'Ikke et callcenter i udlandet. Vi bygger til familier, indkøb og vægttab i den virkelige verden.',
    image: '/billeder/andet/nicolai-founder-ff.png',
    alt: 'Nicolai Varney, stifter af Functional Foods',
    imageFirst: false,
    highlight: true,
    extra: (
      <p className="text-sm text-slate-600 mt-3">
        Læs mere{' '}
        <Link href="/bag-om-ff" className="text-emerald-700 underline hover:text-emerald-800">
          om os
        </Link>
        .
      </p>
    ),
  },
] as const

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact'
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

function KomIGangInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, user, session } = useAuth()
  const { trackEvent } = useAnalytics()
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const turnstileElRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [amountKr, setAmountKr] = useState<number>(60)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [productUpdatesConsent, setProductUpdatesConsent] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  const cancelled = searchParams.get('betaling') === 'annulleret'

  useEffect(() => {
    if (cancelled) {
      setInfo('Betaling blev annulleret. Din konto er stadig oprettet – du kan prøve igen senere under din profil.')
    }
  }, [cancelled])

  useEffect(() => {
    if (!turnstileSiteKey) return

    let cancelled = false
    const timeouts: number[] = []

    const removeWidget = () => {
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current)
        } catch {
          /* ignore */
        }
        turnstileWidgetIdRef.current = null
      }
      setCaptchaToken('')
    }

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms)
      timeouts.push(id)
    }

    const renderTurnstile = () => {
      if (cancelled || !turnstileElRef.current || !window.turnstile || turnstileWidgetIdRef.current) return
      const compact = typeof window !== 'undefined' && window.innerWidth < 520
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileElRef.current, {
        sitekey: turnstileSiteKey,
        theme: 'light',
        size: compact ? 'compact' : 'normal',
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => setCaptchaToken(''),
      })
    }

    const cleanup = () => {
      cancelled = true
      timeouts.forEach((id) => window.clearTimeout(id))
      removeWidget()
    }

    const existing = document.querySelector('script[data-turnstile="true"]')
    if (window.turnstile) {
      renderTurnstile()
      schedule(() => renderTurnstile(), 200)
      return cleanup
    }
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.turnstile = 'true'
      script.onload = () => {
        if (cancelled) return
        renderTurnstile()
        schedule(() => renderTurnstile(), 300)
      }
      document.head.appendChild(script)
      return cleanup
    }
    existing.addEventListener('load', renderTurnstile, { once: true })
    return () => {
      existing.removeEventListener('load', renderTurnstile)
      cleanup()
    }
  }, [turnstileSiteKey])

  const resolvedAmountKr = (): number => {
    if (useCustom) {
      const n = parseInt(customAmount.replace(',', '.').trim(), 10)
      return Number.isFinite(n) ? n : 0
    }
    return amountKr
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!acceptTerms) {
      setError('Du skal acceptere betingelserne for at fortsætte.')
      return
    }
    if (password.length < 8) {
      setError('Adgangskode skal være mindst 8 tegn.')
      return
    }

    const payKr = resolvedAmountKr()
    if (useCustom && (payKr < 0 || payKr > 50_000)) {
      setError('Vælg et beløb mellem 0 og 50.000 kr.')
      return
    }
    if (useCustom && payKr > 0 && payKr < 5) {
      setError('Valgfri støtte under 5 kr kan ikke betales online – vælg 0 kr eller mindst 5 kr.')
      return
    }
    if (turnstileSiteKey && !captchaToken) {
      setError('Bekræft venligst, at du ikke er en robot.')
      return
    }

    setSubmitting(true)
    let skipSubmittingReset = false
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_redirect_url')
      }

      const { error: signErr, session: newSession } = await signUp(
        email.trim(),
        password,
        name.trim() || email.trim().split('@')[0],
        captchaToken || undefined
      )

      if (signErr) {
        setError(signErr.message)
        if (turnstileWidgetIdRef.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetIdRef.current)
          setCaptchaToken('')
        }
        setSubmitting(false)
        return
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_redirect_url')
      }

      const activeSession = newSession ?? session
      const accessToken = activeSession?.access_token

      if (!accessToken) {
        setInfo(
          'Konto oprettet, men email-bekræftelse er stadig aktiv. Slå "Confirm email" fra i Supabase Auth for oprettelse med det samme.'
        )
        setSubmitting(false)
        return
      }

      const prefRes = await fetch('/api/user/signup-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productUpdatesConsent }),
      })

      if (!prefRes.ok) {
        const j = await prefRes.json().catch(() => ({}))
        setError(j.error || 'Kunne ikke gemme dine valg. Prøv igen under profil.')
        setSubmitting(false)
        return
      }

      trackEvent('sign_up', { method: 'direkte', paid: payKr > 0 })

      if (payKr > 0) {
        const payRes = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ amountKr: payKr }),
        })
        const payJson = await payRes.json().catch(() => ({}))
        if (!payRes.ok || !payJson.url) {
          setError(
            payJson.error ||
              'Kunne ikke starte betaling. Du er oprettet – gå til Madbudget og prøv evt. senere fra din profil.'
          )
          setSubmitting(false)
          return
        }
        skipSubmittingReset = true
        window.location.href = payJson.url
        return
      }

      router.push('/overblik?ny=1')
    } catch {
      setError('Noget gik galt. Prøv igen om lidt.')
    } finally {
      if (!skipSubmittingReset) {
        setSubmitting(false)
      }
    }
  }

  if (user && submitting) {
    const goingToPay = resolvedAmountKr() > 0
    return (
      <div className="bg-slate-50 min-h-screen py-16 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Et øjeblik…</h1>
          <p className="text-slate-600 text-sm">
            {goingToPay ? 'Går til betaling…' : 'Opretter din konto…'}
          </p>
        </div>
      </div>
    )
  }

  // Efter signup kan Stripe fejle: user er sat, submitting false, error sat – vis IKKE "allerede logget ind" (det skjuler fejlen).
  if (user && !submitting && !error && !info) {
    return (
      <div className="bg-slate-50 min-h-screen py-16 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Du er allerede logget ind</h1>
          <p className="text-slate-600 text-sm mb-6">
            Gå til Madbudget eller dagligvarer, eller besøg din profil.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/overblik"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-3 text-sm font-medium hover:bg-emerald-700"
            >
              Dit overblik
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/madbudget"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Åbn Madbudget
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-b from-emerald-900 to-emerald-800 text-white">
        <div className="container mx-auto px-4 py-14 max-w-3xl text-center">
          <p className="text-emerald-200 text-sm font-medium tracking-wide uppercase mb-3">
            Functional Foods · Madbudget
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
            Personlige vægttabs-madplaner – bygget omkring{' '}
            <span className="text-amber-300">aktuelle madtilbud</span> i butikkerne.
          </h1>
          <p className="text-emerald-100 text-lg max-w-2xl mx-auto mb-3">
            Vægttabs ugeplaner der er tilpasset dig + ugens tilbud!
          </p>
          <p className="text-emerald-200/90 text-sm max-w-2xl mx-auto">
            Kom i gang på ca. 30 sekunder - Og du må MEGET gerne vælge 0,- kr, og så er din bruger gratis!😉
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* min-w-0 + isolate: undgå at venstre kolonne overlapper højre i grid (klik blokeres ellers i nogle browsere) */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start min-w-0 isolate">
          <div className="min-w-0 relative z-0">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Det får du</h2>
            <ul className="space-y-4">
              {[
                {
                  icon: Sparkles,
                  title: 'Madbudget med ét klik',
                  text: 'Lav en ugeplan ud fra din krop, madstil og de tilbud, du faktisk kan købe.',
                },
                {
                  icon: ShoppingBasket,
                  title: 'Tilbuds-drevne planer',
                  text: 'Vælg dine butikker, så planen matcher tilbud hos fx Netto, REMA og Bilka.',
                },
                {
                  icon: Scale,
                  title: 'Vægttab i fokus',
                  text: 'Kalorier og struktur er tænkt ind fra start, så planen bliver nemmere at følge.',
                },
                {
                  icon: Users,
                  title: 'Hele husstanden',
                  text: 'Tilpas voksne, børn, allergier og præferencer i én samlet madplan.',
                },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{title}</h3>
                    <p className="text-slate-600 text-sm mt-0.5">{text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-slate-50/80 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Sådan fungerer det</h3>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <span className="font-semibold text-emerald-900">1.</span> Du opretter en konto med e-mail og
                  adgangskode.
                </p>
                <p>
                  <span className="font-semibold text-emerald-900">2.</span> Vælg 0 kr eller et valgfrit bidrag.
                </p>
                <p>
                  <span className="font-semibold text-emerald-900">3.</span> Derefter lander du på dit overblik og kan åbne
                  Madbudget og lave din første plan.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 relative z-10 min-w-0 pointer-events-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Opret konto</h2>

            {info && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm px-4 py-3">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fornavn (valgfrit)</label>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="fx Anna"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="dig@email.dk"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adgangskode</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Mindst 8 tegn"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-800 mb-1">
                  Pris: Betal det du kan støtte os med. Du vælger selv.
                </p>
                <p className="text-sm text-slate-500 mb-3">Gennemsnitligt bidrag pr. bruger: 68,5 kr.</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(({ kr, label }) => (
                    <button
                      key={kr}
                      type="button"
                      onClick={() => {
                        setUseCustom(false)
                        setAmountKr(kr)
                      }}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                        !useCustom && amountKr === kr
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUseCustom(true)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                      useCustom
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Andet beløb
                  </button>
                </div>
                {useCustom && (
                  <div className="mt-3">
                    <label className="block text-xs text-slate-600 mb-1">Beløb i kr (0 eller min. 5)</label>
                    <input
                      type="number"
                      min={0}
                      max={50000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="fx 75"
                    />
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-600">
                  Jeg accepterer{' '}
                  <Link href="/indstillinger" className="text-emerald-700 underline hover:text-emerald-800">
                    betingelser og brug af konto
                  </Link>
                  .
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productUpdatesConsent}
                  onChange={(e) => setProductUpdatesConsent(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-600">
                  Ja tak – send mig e-mail når der er <strong>vigtige opdateringer til Madbudget og værktøjerne</strong>.
                  Ingen reklamer, kun produktnyt du kan framelde når som helst.
                </span>
              </label>

              {turnstileSiteKey && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="text-xs font-medium text-slate-700 mb-2">Sikkerhedstjek</p>
                  <div className="flex justify-center w-full">
                    <div ref={turnstileElRef} className="w-full max-w-[300px] min-h-0" />
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500 mt-2">
                    Vi bruger et sikkerhedstjek for at undgå bots.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold py-3.5 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                <Lock size={18} />
                {submitting
                  ? 'Arbejder…'
                  : resolvedAmountKr() > 0
                    ? 'Opret og gå til betaling'
                    : 'Opret og videre'}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-4">
              Har du allerede en konto? Brug <strong>Log ind</strong> øverst på siden.
            </p>
          </div>
        </div>

        <section className="mt-14 border-t border-slate-200 pt-10 space-y-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 text-center">
              Fem grunde til at prøve
            </h2>
            <p className="text-slate-600 text-center mt-3 max-w-3xl mx-auto">
              Vægttab, tilbud, personlig plan - og et hold i Danmark. Kort sagt: mindre snak, mere handling.
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-6">
            {FEM_GRUNDE.map((item) => {
              const imageBlock = (
                <div className="relative aspect-[4/3] min-h-[170px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    className="object-contain object-center p-2"
                    sizes="(min-width: 1024px) 480px, 100vw"
                  />
                </div>
              )
              const textBlock = (
                <div>
                  <p className="text-xs font-semibold tracking-wide uppercase text-emerald-700">{item.focus}</p>
                  <h3 className="text-xl font-semibold text-slate-900 mt-1">{item.title}</h3>
                  <p className={`mt-3 ${item.highlight ? 'text-slate-700' : 'text-slate-600'}`}>{item.text}</p>
                  {'extra' in item && item.extra}
                </div>
              )
              return (
                <article
                  key={item.focus}
                  className={`rounded-2xl border p-6 shadow-sm grid lg:grid-cols-2 gap-6 items-center ${
                    item.highlight
                      ? 'border-emerald-100 bg-emerald-50/60'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {item.imageFirst ? (
                    <>
                      {imageBlock}
                      {textBlock}
                    </>
                  ) : (
                    <>
                      {textBlock}
                      {imageBlock}
                    </>
                  )}
                </article>
              )
            })}
          </div>

          <div className="max-w-5xl mx-auto">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Det får du som medlem</h3>
              <p className="text-slate-600 mt-2">Ét sted. Én plan. Klar til at bruge med det samme.</p>

              <ul className="mt-5 grid sm:grid-cols-2 gap-3">
                {[
                  'Vægttabs-madplan på få klik',
                  'Tilbud fra dine butikker direkte i planen',
                  'Familie, smag og kalorier tilpasset dig',
                  'Ny plan når uge, tilbud eller behov skifter',
                  'Indkøb og struktur – ikke bare opskrifter',
                  'Dansk team – almindelige mennesker',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-slate-700">
                    <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-emerald-900 text-sm font-medium">
                  Pris: Betal det du kan støtte os med. Du vælger selv – også 0 kr.
                </p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function KomIGangPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-slate-50 min-h-screen">
          <div className="bg-gradient-to-b from-emerald-900 to-emerald-800 text-white">
            <div className="container mx-auto px-4 py-14 max-w-3xl text-center">
              <p className="text-emerald-200 text-sm mb-4">Functional Foods · Madbudget</p>
              <div className="h-32 rounded-lg bg-white/10 animate-pulse max-w-xl mx-auto" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-12 max-w-5xl">
            <div className="grid lg:grid-cols-2 gap-10">
              <div className="h-64 bg-slate-200/80 rounded-2xl animate-pulse" />
              <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      }
    >
      <KomIGangInner />
    </Suspense>
  )
}
