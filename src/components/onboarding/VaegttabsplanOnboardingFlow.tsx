'use client'

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ShoppingBasket,
  Target,
  Tag,
  Clock,
  TrendingDown,
  Lock,
  Ban,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAnalytics } from '@/components/AnalyticsProvider'
import { MADBUDGET_SELECTABLE_STORES } from '@/lib/madbudget-stores'
import {
  ACTIVITY_OPTIONS,
  EXCLUDED_FOOD_OPTIONS,
  ONBOARDING_DIETARY_OPTIONS,
  MEAL_PLAN_SCOPE_OPTIONS,
  WEIGHT_GOAL_OPTIONS,
  applyPendingOnboarding,
  calculateOnboardingEnergy,
  defaultOnboardingData,
  loadOnboardingData,
  mealPlanScopeLabel,
  onboardingProfileComplete,
  saveOnboardingData,
  storeName,
  type VaegttabsplanOnboardingData,
} from '@/lib/onboarding/vaegttabsplan-onboarding'

const PRESETS = [
  { kr: 0, label: '0 kr' },
  { kr: 60, label: '60 kr' },
  { kr: 100, label: '100 kr' },
  { kr: 200, label: '200 kr' },
] as const

const STEP = {
  INTRO: 0,
  HOUSEHOLD: 1,
  WEIGHT_GOAL: 2,
  GENDER: 3,
  AGE: 4,
  HEIGHT: 5,
  WEIGHT: 6,
  ACTIVITY: 7,
  CALORIES: 8,
  STORES: 9,
  DIETARY: 10,
  MEAL_SCOPE: 11,
  EXCLUDED: 12,
  SUMMARY: 13,
  SIGNUP: 14,
} as const

const TOTAL_STEPS = 15
const ALMOST_DONE_FROM_STEP = STEP.AGE

const USP_INTRO = {
  icon: Tag,
  title: 'Din plan starter i tilbudsavisen',
  body: 'Vi bygger din vægttabsplan ud fra det, der faktisk er på tilbud hos Netto, REMA, Bilka m.fl. — ikke en fantasivareliste til fuld pris.',
  image: '/billeder/funktioner/functionalfoods-madbudget-1.png',
}

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

function ProgressBar({ step }: { step: number }) {
  const showAlmostDone = step >= ALMOST_DONE_FROM_STEP
  const pct = showAlmostDone
    ? Math.min(94, 78 + Math.min(step - ALMOST_DONE_FROM_STEP, 6) * 2.5)
    : 12 + step * 11

  return (
    <div className="w-full min-w-[8rem] max-w-[12rem] sm:max-w-none sm:flex-1">
      {showAlmostDone && (
        <p className="mb-1 text-right text-xs font-medium text-amber-200/95">Næsten færdig</p>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
        <motion.div
          className="h-full rounded-full bg-amber-300"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>
    </div>
  )
}

const fieldInputClass =
  'w-full rounded-xl border-0 bg-white/10 px-4 py-4 text-lg text-white placeholder:text-emerald-200/40 ring-1 ring-white/20 focus:ring-2 focus:ring-amber-300'

function ProfileFieldStep({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="space-y-8"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold">{title}</h2>
        {hint && <p className="mt-2 text-sm text-emerald-100/85">{hint}</p>}
      </div>
      <div>{children}</div>
    </motion.div>
  )
}

function VaegttabsplanOnboardingInner() {
  const router = useRouter()
  const { signUp, user, session, loading: authLoading } = useAuth()
  const { trackEvent } = useAnalytics()
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const turnstileElRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)

  const [data, setData] = useState<VaegttabsplanOnboardingData>(defaultOnboardingData)
  const [hydrated, setHydrated] = useState(false)

  const [password, setPassword] = useState('')
  const [amountKr, setAmountKr] = useState(60)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [productUpdatesConsent, setProductUpdatesConsent] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  useEffect(() => {
    const saved = loadOnboardingData()
    if (saved) setData(saved)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveOnboardingData(data)
  }, [data, hydrated])

  useEffect(() => {
    if (authLoading || !user) return
    router.replace('/madbudget')
  }, [authLoading, user, router])

  const patch = useCallback((updates: Partial<VaegttabsplanOnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const step = data.currentStep
  const energy = calculateOnboardingEnergy(data)

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) patch({ currentStep: step + 1 })
  }

  const goBack = () => {
    if (step > 0) patch({ currentStep: step - 1 })
  }

  const pickAndAdvance = (updates: Partial<VaegttabsplanOnboardingData>) => {
    if (step >= TOTAL_STEPS - 1) {
      patch(updates)
      return
    }
    patch({ ...updates, currentStep: step + 1 })
  }

  const toggleStore = (id: number) => {
    const next = data.selectedStores.includes(id)
      ? data.selectedStores.filter((s) => s !== id)
      : [...data.selectedStores, id]
    patch({ selectedStores: next })
  }

  const toggleExcludedFood = (id: string) => {
    const current = data.excludedFoods ?? []
    const next = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id]
    patch({ excludedFoods: next })
  }

  const canContinue = (): boolean => {
    switch (step) {
      case STEP.INTRO:
        return true
      case STEP.HOUSEHOLD:
        return Boolean(data.adults && data.adults >= 1 && data.children != null && data.children >= 0)
      case STEP.WEIGHT_GOAL:
        return Boolean(data.weightGoal)
      case STEP.GENDER:
        return Boolean(data.gender)
      case STEP.AGE:
        return Boolean(data.age && data.age > 0 && data.age < 120)
      case STEP.HEIGHT:
        return Boolean(data.height && data.height > 40 && data.height < 260)
      case STEP.WEIGHT:
        return Boolean(data.weight && data.weight > 25 && data.weight < 400)
      case STEP.ACTIVITY:
        return data.activityLevel != null
      case STEP.CALORIES:
        return Boolean(energy)
      case STEP.STORES:
        return data.selectedStores.length > 0
      case STEP.DIETARY:
        return Boolean(data.dietaryApproach)
      case STEP.MEAL_SCOPE:
        return Boolean(data.mealPlanScope)
      case STEP.EXCLUDED:
        return true
      case STEP.SUMMARY:
        return onboardingProfileComplete(data)
      case STEP.SIGNUP:
        return false
      default:
        return true
    }
  }

  useEffect(() => {
    if (step !== STEP.SIGNUP || !turnstileSiteKey) return

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
      timeouts.push(window.setTimeout(fn, ms))
    }

    const renderTurnstile = () => {
      if (cancelled || !turnstileElRef.current || !window.turnstile || turnstileWidgetIdRef.current) return
      const compact = window.innerWidth < 520
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

    if (window.turnstile) {
      renderTurnstile()
      schedule(renderTurnstile, 200)
      return cleanup
    }

    const existing = document.querySelector('script[data-turnstile="true"]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.turnstile = 'true'
      script.onload = () => {
        if (!cancelled) {
          renderTurnstile()
          schedule(renderTurnstile, 300)
        }
      }
      document.head.appendChild(script)
      return cleanup
    }

    existing.addEventListener('load', renderTurnstile, { once: true })
    return () => {
      existing.removeEventListener('load', renderTurnstile)
      cleanup()
    }
  }, [step, turnstileSiteKey])

  const resolvedAmountKr = (): number => {
    if (useCustom) {
      const n = parseInt(customAmount.replace(',', '.').trim(), 10)
      return Number.isFinite(n) ? n : 0
    }
    return amountKr
  }

  const finishSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!data.email?.trim()) {
      setError('Angiv din e-mail.')
      return
    }
    if (!acceptTerms) {
      setError('Du skal acceptere betingelserne.')
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
    let skipReset = false
    try {
      const { error: signErr, session: newSession } = await signUp(
        data.email.trim(),
        password,
        data.name?.trim() || data.email.trim().split('@')[0],
        captchaToken || undefined
      )

      if (signErr) {
        setError(signErr.message)
        if (turnstileWidgetIdRef.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetIdRef.current)
          setCaptchaToken('')
        }
        return
      }

      const activeSession = newSession ?? session
      const accessToken = activeSession?.access_token

      if (!accessToken) {
        setInfo('Konto oprettet — tjek din e-mail for at bekræfte, og log ind bagefter.')
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
        setError(j.error || 'Kunne ikke gemme dine valg.')
        return
      }

      await applyPendingOnboarding(accessToken)

      trackEvent('sign_up', { method: 'guidet_plan', paid: payKr > 0 })

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
          setError(payJson.error || 'Kunne ikke starte betaling — din profil er gemt, gå til Madbudget.')
          return
        }
        skipReset = true
        window.location.href = payJson.url
        return
      }

      router.push('/madbudget?ny=1')
    } catch {
      setError('Noget gik galt. Prøv igen om lidt.')
    } finally {
      if (!skipReset) setSubmitting(false)
    }
  }

  if (!hydrated || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-950 text-emerald-100">
        <Image
          src="/billeder/favicon/ff-logo%20favicon%20white%20logo.jpg.png"
          alt="Functional Foods"
          width={80}
          height={80}
          className="h-20 w-20 rounded-2xl object-contain"
          priority
        />
      </div>
    )
  }

  if (user) return null

  const IntroIcon = USP_INTRO.icon

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-emerald-100/80 hover:text-white">
            Functional Foods
          </Link>
          <ProgressBar step={step} />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 pb-28">
        <AnimatePresence mode="wait">
          {step === STEP.INTRO && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Gratis at starte
              </div>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                Lav din personlige vægttabsplan på få minutter
              </h1>
              <p className="text-emerald-100/90 leading-relaxed">
                Vi guider dig igennem det vigtigste - så din plan er klar, når du opretter dig. Og bare rolig - du
                ender <strong className="font-semibold text-white">IKKE</strong> med at skulle betale til sidst. Det er
                valgfrit.
              </p>
              <div className="overflow-hidden rounded-2xl ring-1 ring-white/15">
                <Image
                  src={USP_INTRO.image}
                  alt="Madbudget: ugeoversigt og madplan i Functional Foods"
                  width={640}
                  height={360}
                  className="h-auto w-full object-cover"
                />
              </div>
              <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
                <div className="mb-2 flex items-center gap-2 text-amber-300">
                  <IntroIcon className="h-5 w-5" />
                  <span className="font-semibold">{USP_INTRO.title}</span>
                </div>
                <p className="text-sm text-emerald-50/95 leading-relaxed">{USP_INTRO.body}</p>
              </div>
            </motion.div>
          )}

          {step === STEP.HOUSEHOLD && (
            <ProfileFieldStep
              key="household"
              eyebrow="Din husstand"
              title="Hvem spiser med?"
              hint="Madplan og indkøbsliste skaleres efter antal personer."
            >
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-emerald-100/90">
                    Antal voksne (inkl. dig)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={data.adults ?? 1}
                    onChange={(e) =>
                      patch({ adults: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)) })
                    }
                    className={fieldInputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-emerald-100/90">Antal børn</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={data.children ?? 0}
                    onChange={(e) =>
                      patch({ children: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) })
                    }
                    className={fieldInputClass}
                  />
                </div>
              </div>
            </ProfileFieldStep>
          )}

          {step === STEP.WEIGHT_GOAL && (
            <motion.div key="weight-goal" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Dit mål</p>
                <h2 className="mt-1 text-2xl font-bold">Hvad vil du opnå?</h2>
                <p className="mt-2 text-sm text-emerald-100/85">Vi tilpasser kalorier og planen derefter.</p>
              </div>
              <div className="space-y-3">
                {WEIGHT_GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => pickAndAdvance({ weightGoal: g.value })}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
                      data.weightGoal === g.value
                        ? 'border-amber-300 bg-white/15'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <div>
                      <div className="font-semibold">{g.label}</div>
                      <div className="text-sm text-emerald-100/80">{g.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === STEP.GENDER && (
            <ProfileFieldStep
              key="gender"
              eyebrow="Om dig"
              title="Hvad er dit køn?"
              hint="Bruges til at beregne dit kaloriebehov."
            >
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { value: 'male' as const, label: 'Mand' },
                    { value: 'female' as const, label: 'Kvinde' },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => pickAndAdvance({ gender: value })}
                    className={`rounded-xl border-2 px-4 py-5 text-lg font-semibold transition ${
                      data.gender === value
                        ? 'border-amber-300 bg-white/15'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </ProfileFieldStep>
          )}

          {step === STEP.AGE && (
            <ProfileFieldStep key="age" eyebrow="Om dig" title="Hvor gammel er du?">
              <label className="block">
                <span className="sr-only">Alder</span>
                <input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  value={data.age ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    patch({ age: Number.isFinite(v) ? v : undefined })
                  }}
                  placeholder="år"
                  className={fieldInputClass}
                />
              </label>
            </ProfileFieldStep>
          )}

          {step === STEP.HEIGHT && (
            <ProfileFieldStep key="height" eyebrow="Om dig" title="Hvor høj er du?">
              <label className="block">
                <span className="sr-only">Højde</span>
                <input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  value={data.height ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    patch({ height: Number.isFinite(v) ? v : undefined })
                  }}
                  placeholder="cm"
                  className={fieldInputClass}
                />
              </label>
            </ProfileFieldStep>
          )}

          {step === STEP.WEIGHT && (
            <ProfileFieldStep key="weight" eyebrow="Om dig" title="Hvad vejer du?">
              <label className="block">
                <span className="sr-only">Vægt</span>
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={data.weight ?? ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    patch({ weight: Number.isFinite(v) ? v : undefined })
                  }}
                  placeholder="kg"
                  className={fieldInputClass}
                />
              </label>
            </ProfileFieldStep>
          )}

          {step === STEP.ACTIVITY && (
            <ProfileFieldStep
              key="activity"
              eyebrow="Om dig"
              title="Hvor aktiv er du?"
              hint="Vælg det der passer bedst til din hverdag."
            >
              <div className="space-y-2">
                {ACTIVITY_OPTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => pickAndAdvance({ activityLevel: a.value })}
                    className={`flex w-full flex-col rounded-xl border-2 p-4 text-left transition ${
                      data.activityLevel === a.value
                        ? 'border-amber-300 bg-white/15'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <span className="font-semibold">{a.label}</span>
                    <span className="text-sm text-emerald-100/80">{a.hint}</span>
                  </button>
                ))}
              </div>
            </ProfileFieldStep>
          )}

          {step === STEP.CALORIES && energy && (
            <motion.div key="calories" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Effektivt vægttab</p>
                <h2 className="mt-1 text-2xl font-bold">Dit daglige kalorietarget</h2>
                <p className="mt-2 text-sm text-emerald-100/85">
                  Beregnet til dig — madplanen bygger videre på dette tal.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: Math.round(energy.bmr), label: 'Basal stofskifte' },
                  { val: Math.round(energy.tdee), label: 'Dagligt forbrug' },
                  { val: energy.targetCalories, label: 'Dit target', highlight: true },
                ].map(({ val, label, highlight }) => (
                  <div
                    key={label}
                    className={`rounded-xl p-3 text-center ring-1 ${
                      highlight ? 'bg-amber-400/20 ring-amber-300/50' : 'bg-white/10 ring-white/15'
                    }`}
                  >
                    <div className={`text-xl font-bold ${highlight ? 'text-amber-200' : ''}`}>{val}</div>
                    <div className="mt-0.5 text-[10px] leading-tight text-emerald-100/75">{label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <p className="text-sm text-emerald-50/95 leading-relaxed">
                  <strong className="text-white">Ingen gætteri.</strong> Hver ret i din ugeplan matcher dit mål — du
                  slipper for at tælle kalorier manuelt hver aften.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-amber-400/15 p-4 ring-1 ring-amber-300/30">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                <p className="text-sm leading-relaxed text-emerald-50/95">
                  <strong className="text-white">Nu bygger vi videre.</strong> Vi skal nok lave en super stærk
                  vægttabsplan til dig — tilpasset dit target og det, der er på tilbud i dine butikker.
                </p>
              </div>
            </motion.div>
          )}

          {step === STEP.STORES && (
            <motion.div key="stores" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Spar på indkøbet</p>
                <h2 className="mt-1 text-2xl font-bold">Hvor handler du?</h2>
                <p className="mt-2 text-sm text-emerald-100/85">Vi matcher planen med tilbud i dine butikker.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {MADBUDGET_SELECTABLE_STORES.map((store) => {
                  const on = data.selectedStores.includes(store.id)
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => toggleStore(store.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ring-1 ${
                        on
                          ? 'bg-amber-300 text-emerald-950 ring-amber-200'
                          : 'bg-white/10 text-white ring-white/20 hover:bg-white/15'
                      }`}
                    >
                      {store.name}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <ShoppingBasket className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <p className="text-sm text-emerald-50/95 leading-relaxed">
                  Planen opdateres løbende med <strong className="text-white">ugens tilbud</strong> — så du sparer uden
                  at jagte tilbudsavisen selv.
                </p>
              </div>
            </motion.div>
          )}

          {step === STEP.DIETARY && (
            <motion.div key="dietary" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Din madstil</p>
                <h2 className="mt-1 text-2xl font-bold">Vælg kostretning</h2>
                <p className="mt-2 text-sm text-emerald-100/85">Du kan ændre det senere i Madbudget.</p>
              </div>
              <div className="space-y-2">
                {ONBOARDING_DIETARY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickAndAdvance({ dietaryApproach: opt.id })}
                    className={`flex w-full flex-col rounded-xl border-2 p-4 text-left transition ${
                      data.dietaryApproach === opt.id
                        ? 'border-amber-300 bg-white/15'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <span className="font-semibold">{opt.name}</span>
                    <span className="text-sm text-emerald-100/80">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === STEP.MEAL_SCOPE && (
            <motion.div key="meal-scope" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Din plan</p>
                <h2 className="mt-1 text-2xl font-bold">Hvilke måltider vil du have planlagt?</h2>
                <p className="mt-2 text-sm text-emerald-100/85">
                  Vælg om du vil have hele dagen med, eller start med aftensmaden.
                </p>
              </div>
              <div className="space-y-3">
                {MEAL_PLAN_SCOPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickAndAdvance({ mealPlanScope: opt.id })}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
                      data.mealPlanScope === opt.id
                        ? 'border-amber-300 bg-white/15'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-sm text-emerald-100/80">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="rounded-xl bg-white/10 px-4 py-3 text-sm text-emerald-50/95 ring-1 ring-white/15 leading-relaxed">
                <strong className="text-white">Bemærk:</strong> Hvis du er i tvivl, så start med aftensmad kun - du kan
                altid ændre det senere.
              </p>
            </motion.div>
          )}

          {step === STEP.EXCLUDED && (
            <motion.div key="excluded" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Fravalg og allergier</p>
                <h2 className="mt-1 text-2xl font-bold">Er der noget, der ikke skal med?</h2>
                <p className="mt-2 text-sm text-emerald-100/85">
                  Vælg madvarer du ikke kan lide eller ikke tåler - så holder vi dem ude af hele din uge. Spring over hvis
                  intet skal fravælges.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EXCLUDED_FOOD_OPTIONS.map((food) => {
                  const on = (data.excludedFoods ?? []).includes(food.id)
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => toggleExcludedFood(food.id)}
                      className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                        on
                          ? 'border-amber-300 bg-white/15'
                          : 'border-white/15 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      {food.label}
                    </button>
                  )
                })}
              </div>
              <p className="rounded-xl bg-white/10 px-4 py-3 text-sm text-emerald-50/95 ring-1 ring-white/15 leading-relaxed">
                <strong className="text-white">Frivilligt.</strong> Du kan altid justere fravalg og allergier senere i
                Madbudget.
              </p>
            </motion.div>
          )}

          {step === STEP.SUMMARY && (
            <motion.div key="summary" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Næsten klar</p>
                <h2 className="mt-1 text-2xl font-bold">Din plan er sat op</h2>
                <p className="mt-2 text-sm text-emerald-100/85">Opret konto — så udfylder vi det hele for dig.</p>
              </div>
              <ul className="space-y-3 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
                {[
                  { icon: Users, text: `Husstand: ${data.adults ?? 1} voksen(e)${(data.children ?? 0) > 0 ? `, ${data.children} barn` : ''}` },
                  { icon: Target, text: `Mål: ${WEIGHT_GOAL_OPTIONS.find((g) => g.value === data.weightGoal)?.label ?? '—'}` },
                  { icon: TrendingDown, text: energy ? `Kalorietarget: ${energy.targetCalories} kcal/dag` : 'Kalorier beregnet' },
                  { icon: Clock, text: `Måltider: ${mealPlanScopeLabel(data.mealPlanScope)}` },
                  { icon: Tag, text: `Kostretning: ${ONBOARDING_DIETARY_OPTIONS.find((d) => d.id === data.dietaryApproach)?.name ?? '—'}` },
                  { icon: Tag, text: `Butikker: ${data.selectedStores.map(storeName).join(', ')}` },
                  ...((data.excludedFoods ?? []).length
                    ? [
                        {
                          icon: Ban,
                          text: `Fravalgt: ${data.excludedFoods
                            .map((id) => EXCLUDED_FOOD_OPTIONS.find((f) => f.id === id)?.label ?? id)
                            .join(', ')}`,
                        },
                      ]
                    : []),
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                    <Icon className="h-4 w-4 shrink-0 text-amber-300/80" aria-hidden />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-3 rounded-2xl bg-amber-400/15 p-4 ring-1 ring-amber-300/30">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                <p className="text-sm leading-relaxed text-emerald-50/95">
                  <strong className="text-white">Hele ugen på plads.</strong> Madplan, opskrifter og indkøbsliste — du
                  slipper for at gætte hver aften.
                </p>
              </div>
            </motion.div>
          )}

          {step === STEP.SIGNUP && (
            <motion.div key="signup" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Sidste trin</p>
                <h2 className="mt-1 text-2xl font-bold">Opret din konto</h2>
                <p className="mt-2 text-sm text-emerald-100/85">
                  Gratis at starte — vælg 0 kr eller støt os med et valgfrit beløb.
                </p>
              </div>

              {info && (
                <div className="rounded-xl bg-emerald-800/80 px-4 py-3 text-sm text-emerald-50 ring-1 ring-emerald-600/50">
                  {info}
                </div>
              )}
              {error && (
                <div className="rounded-xl bg-red-900/40 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/30">
                  {error}
                </div>
              )}

              <form id="onboarding-signup" onSubmit={finishSignup} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-emerald-100/80">Fornavn (valgfrit)</span>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={data.name ?? ''}
                    onChange={(e) => patch({ name: e.target.value })}
                    className="w-full rounded-xl border-0 bg-white/10 px-3 py-3 text-white ring-1 ring-white/20 focus:ring-2 focus:ring-amber-300"
                    placeholder="fx Anna"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-emerald-100/80">E-mail</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={data.email ?? ''}
                    onChange={(e) => patch({ email: e.target.value })}
                    className="w-full rounded-xl border-0 bg-white/10 px-3 py-3 text-white ring-1 ring-white/20 focus:ring-2 focus:ring-amber-300"
                    placeholder="dig@email.dk"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-emerald-100/80">Adgangskode</span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border-0 bg-white/10 px-3 py-3 text-white ring-1 ring-white/20 focus:ring-2 focus:ring-amber-300"
                    placeholder="Mindst 8 tegn"
                  />
                </label>

                <div className="border-t border-white/10 pt-4">
                  <p className="mb-2 text-sm font-medium">Betal det du kan — eller 0 kr</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map(({ kr, label }) => (
                      <button
                        key={kr}
                        type="button"
                        onClick={() => {
                          setUseCustom(false)
                          setAmountKr(kr)
                        }}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                          !useCustom && amountKr === kr
                            ? 'bg-amber-300 text-emerald-950 ring-amber-200'
                            : 'bg-white/10 text-white ring-white/20'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setUseCustom(true)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                        useCustom ? 'bg-amber-300 text-emerald-950 ring-amber-200' : 'bg-white/10 text-white ring-white/20'
                      }`}
                    >
                      Andet
                    </button>
                  </div>
                  {useCustom && (
                    <input
                      type="number"
                      min={0}
                      max={50000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="mt-2 w-full max-w-xs rounded-xl border-0 bg-white/10 px-3 py-2 text-white ring-1 ring-white/20"
                      placeholder="Beløb i kr"
                    />
                  )}
                </div>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 rounded border-white/30 bg-white/10 text-amber-400 focus:ring-amber-300"
                  />
                  <span className="text-sm text-emerald-100/85">
                    Jeg accepterer{' '}
                    <Link href="/indstillinger" className="underline text-amber-200">
                      betingelser
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={productUpdatesConsent}
                    onChange={(e) => setProductUpdatesConsent(e.target.checked)}
                    className="mt-1 rounded border-white/30 bg-white/10 text-amber-400 focus:ring-amber-300"
                  />
                  <span className="text-sm text-emerald-100/85">Ja tak til nyheder om nye funktioner (valgfrit)</span>
                </label>

                {turnstileSiteKey && <div ref={turnstileElRef} className="min-h-[65px]" />}
              </form>

              <div className="flex items-center gap-2 text-xs text-emerald-100/60">
                <Lock className="h-3.5 w-3.5" />
                Dine svar gemmes lokalt indtil du opretter dig
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-emerald-950/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 rounded-xl px-4 py-3 text-sm font-medium text-emerald-100 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbage
            </button>
          ) : (
            <Link href="/" className="px-4 py-3 text-sm text-emerald-100/70 hover:text-white">
              Forside
            </Link>
          )}

          {step < STEP.SIGNUP ? (
            <button
              type="button"
              disabled={!canContinue()}
              onClick={goNext}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 py-3 text-sm font-bold text-emerald-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Fortsæt
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              form="onboarding-signup"
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 py-3 text-sm font-bold text-emerald-950 transition hover:bg-amber-200 disabled:opacity-60 sm:flex-none"
            >
              {submitting ? 'Opretter…' : 'Opret og start planen'}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

export default function VaegttabsplanOnboardingFlow() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-emerald-950 text-emerald-100">
          <p className="text-sm">Indlæser…</p>
        </div>
      }
    >
      <VaegttabsplanOnboardingInner />
    </Suspense>
  )
}
