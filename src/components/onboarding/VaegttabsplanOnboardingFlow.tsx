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
import OnboardingPricingStep from '@/components/subscription/OnboardingPricingStep'
import HealthInformationNotice from '@/components/HealthInformationNotice'
import { Cite } from '@/components/Cite'
import { healthMethodologyAnchor } from '@/lib/health-sources'
import OAuthProviderButtons from '@/components/auth/OAuthProviderButtons'
import { FREE_FOREVER_SIGNUP } from '@/lib/free-product'
import { type CheckoutPlan } from '@/lib/subscription-tiers'
import { completeSignupAfterAuth } from '@/lib/onboarding/complete-signup'
import { readStoredReferralCode } from '@/lib/referral-client'
import { normalizeReferralCode } from '@/lib/referral-shared'
import {
  clearOAuthSignupPending,
  hasOAuthSignupPending,
  loadOAuthSignupPending,
  saveOAuthSignupPending,
} from '@/lib/oauth-signup-pending'
import {
  ACTIVITY_OPTIONS,
  EXCLUDED_FOOD_OPTIONS,
  ONBOARDING_DIETARY_OPTIONS,
  WEIGHT_GOAL_OPTIONS,
  calculateOnboardingEnergy,
  defaultOnboardingData,
  hasPendingOnboardingData,
  loadOnboardingData,
  onboardingMealSummary,
  onboardingProfileComplete,
  saveCheckoutPlan,
  loadCheckoutPlan,
  saveOnboardingData,
  storeName,
  FF_AUTO_FIRST_PLAN_KEY,
  type VaegttabsplanOnboardingData,
} from '@/lib/onboarding/vaegttabsplan-onboarding'
import {
  breakfastStyleHint,
  breakfastStyleLabel,
  isKetoLikeDiet,
  lunchStyleHint,
  lunchStyleLabel,
  type BreakfastStyle,
  type LunchStyle,
} from '@/lib/madbudget/meal-slot-style'

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
  BREAKFAST_STYLE: 12,
  LUNCH_STYLE: 13,
  EXCLUDED: 14,
  PRICING: 15,
  SUMMARY: 16,
  SIGNUP: 17,
} as const

function signupPlanCopy(): string {
  return FREE_FOREVER_SIGNUP
}

const TOTAL_STEPS = 18
const ALMOST_DONE_FROM_STEP = STEP.AGE

const USP_INTRO = {
  icon: Tag,
  title: 'Din plan starter i tilbudsavisen',
  body: 'Vi bygger din vægttabsplan ud fra det, der faktisk er på tilbud hos Netto, REMA, Bilka m.fl. — ikke en fantasivareliste til fuld pris.',
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
  const oauthCompletionStartedRef = useRef(false)

  const [data, setData] = useState<VaegttabsplanOnboardingData>(defaultOnboardingData)
  const [hydrated, setHydrated] = useState(false)

  const [password, setPassword] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [selectedTier, setSelectedTier] = useState<CheckoutPlan>('plus')
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [productUpdatesConsent, setProductUpdatesConsent] = useState(true)
  const [referralCode, setReferralCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    const cancelled = new URLSearchParams(window.location.search).get('betaling') === 'annulleret'
    if (!cancelled) return
    try {
      window.localStorage.removeItem(FF_AUTO_FIRST_PLAN_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const saved = loadOnboardingData()
    if (saved) {
      if (saved.currentStep === STEP.PRICING) saved.currentStep = STEP.SUMMARY
      setData(saved)
    }
    const plan = loadCheckoutPlan()
    if (plan) setSelectedTier(plan)
    const stored = readStoredReferralCode()
    if (stored) setReferralCode(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveOnboardingData(data)
  }, [data, hydrated])

  useEffect(() => {
    if (authLoading || !user) return
    if (hasOAuthSignupPending()) return
    // Undgå at smide brugeren væk midt i signup (signUp sætter user før completeSignup er færdig).
    if (submitting) return
    if (hasPendingOnboardingData()) return
    router.replace('/madbudget')
  }, [authLoading, user, router, submitting])

  useEffect(() => {
    if (authLoading || !user || !session?.access_token) return
    const pending = loadOAuthSignupPending()
    if (!pending) return
    if (oauthCompletionStartedRef.current) return
    oauthCompletionStartedRef.current = true

    let cancelled = false
    setSubmitting(true)
    setError('')

    const run = async () => {
      const result = await completeSignupAfterAuth(
        session.access_token,
        pending.tier,
        pending.productUpdatesConsent,
        pending.referralCode
      )
      if (cancelled) return

      clearOAuthSignupPending()
      trackEvent('sign_up', { method: 'oauth', tier: pending.tier })

      if (!result.ok) {
        oauthCompletionStartedRef.current = false
        setError(result.error)
        setSubmitting(false)
        return
      }

      if (result.external) {
        window.location.href = result.redirectUrl
        return
      }

      router.replace(result.redirectUrl)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, session, router, trackEvent])

  const patch = useCallback((updates: Partial<VaegttabsplanOnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const step = data.currentStep
  const energy = calculateOnboardingEnergy(data)

  const nextAfterMealScope = (breakfast?: BreakfastStyle, lunch?: LunchStyle) => {
    if (breakfast && breakfast !== 'skip') return STEP.BREAKFAST_STYLE
    if (lunch && lunch !== 'skip') return STEP.LUNCH_STYLE
    return STEP.EXCLUDED
  }

  const goNext = () => {
    if (step === STEP.MEAL_SCOPE) {
      patch({ currentStep: nextAfterMealScope(data.breakfastStyle, data.lunchStyle) })
      return
    }
    if (step === STEP.BREAKFAST_STYLE) {
      patch({
        currentStep:
          data.lunchStyle && data.lunchStyle !== 'skip' ? STEP.LUNCH_STYLE : STEP.EXCLUDED,
      })
      return
    }
    if (step === STEP.LUNCH_STYLE || step === STEP.EXCLUDED) {
      patch({ currentStep: STEP.SUMMARY })
      return
    }
    if (step < TOTAL_STEPS - 1) patch({ currentStep: step + 1 })
  }

  const goBack = () => {
    if (step === STEP.SUMMARY) {
      patch({ currentStep: STEP.EXCLUDED })
      return
    }
    if (step === STEP.EXCLUDED) {
      if (data.lunchStyle && data.lunchStyle !== 'skip') {
        patch({ currentStep: STEP.LUNCH_STYLE })
        return
      }
      if (data.breakfastStyle && data.breakfastStyle !== 'skip') {
        patch({ currentStep: STEP.BREAKFAST_STYLE })
        return
      }
      patch({ currentStep: STEP.MEAL_SCOPE })
      return
    }
    if (step === STEP.LUNCH_STYLE) {
      patch({
        currentStep:
          data.breakfastStyle && data.breakfastStyle !== 'skip'
            ? STEP.BREAKFAST_STYLE
            : STEP.MEAL_SCOPE,
      })
      return
    }
    if (step === STEP.BREAKFAST_STYLE) {
      patch({ currentStep: STEP.MEAL_SCOPE })
      return
    }
    if (step > 0) patch({ currentStep: step - 1 })
  }

  const pickAndAdvance = (updates: Partial<VaegttabsplanOnboardingData>) => {
    if (step >= TOTAL_STEPS - 1) {
      patch(updates)
      return
    }
    if (step === STEP.BREAKFAST_STYLE) {
      const lunch = updates.lunchStyle ?? data.lunchStyle
      patch({
        ...updates,
        currentStep: lunch && lunch !== 'skip' ? STEP.LUNCH_STYLE : STEP.EXCLUDED,
      })
      return
    }
    if (step === STEP.LUNCH_STYLE) {
      patch({ ...updates, currentStep: STEP.EXCLUDED })
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
        return Boolean(data.breakfastStyle && data.lunchStyle)
      case STEP.BREAKFAST_STYLE:
        return Boolean(data.breakfastStyle && data.breakfastStyle !== 'skip')
      case STEP.LUNCH_STYLE:
        return Boolean(data.lunchStyle && data.lunchStyle !== 'skip')
      case STEP.EXCLUDED:
        return true
      case STEP.PRICING:
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
    if (step >= STEP.SIGNUP) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return
      const target = e.target
      if (!(target instanceof HTMLInputElement)) return
      if (target.type === 'checkbox' || target.type === 'radio' || target.type === 'hidden') return
      e.preventDefault()
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          'main input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])'
        )
      )
      const next = inputs[inputs.indexOf(target) + 1]
      if (next) {
        next.focus()
        return
      }
      if (canContinue()) goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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

  const finishSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!data.email?.trim()) {
      setError('Angiv din e-mail.')
      return
    }
    if (data.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
      setError('E-mail og bekræftelse er ikke ens. Tjek for tastefejl.')
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

      const result = await completeSignupAfterAuth(
        accessToken,
        'free',
        productUpdatesConsent,
        normalizeReferralCode(referralCode)
      )

      if (!result.ok) {
        setError(result.error)
        return
      }

      trackEvent('sign_up', { method: 'guidet_plan', tier: 'free' })

      if (result.external) {
        skipReset = true
        window.location.href = result.redirectUrl
        return
      }

      router.push(result.redirectUrl)
    } catch {
      setError('Noget gik galt. Prøv igen om lidt.')
    } finally {
      if (!skipReset) setSubmitting(false)
    }
  }

  const continueToPayment = async () => {
    const accessToken = session?.access_token
    if (!accessToken) {
      setError('Log ind igen, så kan betalingen åbne.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await completeSignupAfterAuth(
        accessToken,
        'free',
        productUpdatesConsent,
        normalizeReferralCode(referralCode)
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.external) {
        window.location.href = result.redirectUrl
        return
      }
      router.push(result.redirectUrl)
    } catch {
      setError('Noget gik galt. Prøv igen om lidt.')
    } finally {
      setSubmitting(false)
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

  if (user) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center bg-emerald-950 px-4 py-16 text-white">
        <h1 className="text-2xl font-bold">Kontoen er klar</h1>
        <p className="mt-3 text-sm leading-relaxed text-emerald-100/85">
          Functional Foods er gratis. Vi lægger madplanen klar til dig.
        </p>
        {error ? (
          <p className="mt-4 rounded-xl bg-red-900/40 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/30">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={continueToPayment}
          disabled={submitting}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-amber-300 px-6 py-3 text-sm font-bold text-emerald-950 hover:bg-amber-200 disabled:opacity-60"
        >
          {submitting ? 'Åbner madplanen…' : 'Gå til madplanen'}
        </button>
      </div>
    )
  }

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
                Gratis på ubestemt tid
              </div>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                Lav din personlige vægttabsplan på få minutter
              </h1>
              <p className="text-emerald-100/90 leading-relaxed">{FREE_FOREVER_SIGNUP}</p>
              <div className="overflow-hidden rounded-2xl ring-1 ring-white/15">
                <Image
                  src="/billeder/andet/gratis-paa-ubestemt-tid.jpg"
                  alt="Nicolai foran ambulancen. Teksten på billedet: Gratis på ubestemt tid."
                  width={678}
                  height={494}
                  className="h-auto w-full"
                  priority
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
                    type="text"
                    inputMode="numeric"
                    min={1}
                    max={10}
                    value={data.adults ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      if (!raw) {
                        patch({ adults: undefined })
                        return
                      }
                      const n = parseInt(raw, 10)
                      if (!Number.isFinite(n)) return
                      patch({ adults: Math.min(10, Math.max(1, n)) })
                    }}
                    className={fieldInputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-emerald-100/90">Antal børn</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    min={0}
                    max={10}
                    value={data.children ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      if (!raw) {
                        patch({ children: undefined })
                        return
                      }
                      const n = parseInt(raw, 10)
                      if (!Number.isFinite(n)) return
                      patch({ children: Math.min(10, Math.max(0, n)) })
                    }}
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
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={data.age ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      if (!raw) {
                        patch({ age: undefined })
                        return
                      }
                      const v = parseInt(raw, 10)
                      patch({ age: Number.isFinite(v) ? v : undefined })
                    }}
                    placeholder="fx 30"
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
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={data.height ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      if (!raw) {
                        patch({ height: undefined })
                        return
                      }
                      const v = parseInt(raw, 10)
                      patch({ height: Number.isFinite(v) ? v : undefined })
                    }}
                    placeholder="fx 175"
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
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={data.weight ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
                      if (!raw) {
                        patch({ weight: undefined })
                        return
                      }
                      const v = parseFloat(raw)
                      patch({ weight: Number.isFinite(v) ? v : undefined })
                    }}
                    placeholder="fx 80"
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
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Estimeret energimål</p>
                <h2 className="mt-1 text-2xl font-bold">Dit daglige kalorietarget</h2>
                <p className="mt-2 text-sm text-emerald-100/85">
                  Vejledende estimat ud fra din profil
                  <Cite n={1} color="amber" href={healthMethodologyAnchor(1)} />
                  <Cite n={5} color="amber" href={healthMethodologyAnchor(5)} />
                  — madplanen bygger videre på dette tal.
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
              <HealthInformationNotice variant="dark" />
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
                  Planen laves ud fra <strong className="text-white">ugens tilbud</strong> - så du kan se prisen i dine
                  valgte dagligvarebutikker på dagen du handler ind.
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
                <h2 className="mt-1 text-2xl font-bold">Hvordan vil du have morgenmad og frokost?</h2>
                <p className="mt-2 text-sm text-emerald-100/85">
                  Aftensmad er altid med. Periodisk faste er bare at springe et af de andre over.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold">Morgenmad</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {([
                      { id: 'skip' as const, label: 'Jeg faster morgenmad', desc: 'Ingen morgenmad i planen.' },
                      {
                        id: 'fast' as const,
                        label: 'Jeg vil have morgenmad planlagt',
                        desc: 'Vi spørger lige hvordan den skal laves.',
                      },
                    ] as const).map((opt) => {
                      const selected =
                        opt.id === 'skip'
                          ? data.breakfastStyle === 'skip'
                          : Boolean(data.breakfastStyle && data.breakfastStyle !== 'skip')
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            patch({
                              breakfastStyle: opt.id,
                              mealPlanScope:
                                opt.id !== 'skip' || (data.lunchStyle && data.lunchStyle !== 'skip')
                                  ? 'full'
                                  : 'dinner-only',
                            })
                          }
                          className={`rounded-xl border-2 p-4 text-left transition ${
                            selected
                              ? 'border-amber-300 bg-white/15'
                              : 'border-white/15 bg-white/5 hover:border-white/30'
                          }`}
                        >
                          <div className="font-semibold">{opt.label}</div>
                          <div className="mt-1 text-sm text-emerald-100/80">{opt.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Frokost</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {([
                      { id: 'skip' as const, label: 'Jeg faster frokost', desc: 'Ingen frokost i planen.' },
                      {
                        id: 'home' as const,
                        label: 'Jeg vil have frokost planlagt',
                        desc: 'Vi spørger lige om rester, madpakke eller hjemme.',
                      },
                    ] as const).map((opt) => {
                      const selected =
                        opt.id === 'skip'
                          ? data.lunchStyle === 'skip'
                          : Boolean(data.lunchStyle && data.lunchStyle !== 'skip')
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            patch({
                              lunchStyle: opt.id,
                              mealPlanScope:
                                opt.id !== 'skip' || (data.breakfastStyle && data.breakfastStyle !== 'skip')
                                  ? 'full'
                                  : 'dinner-only',
                            })
                          }
                          className={`rounded-xl border-2 p-4 text-left transition ${
                            selected
                              ? 'border-amber-300 bg-white/15'
                              : 'border-white/15 bg-white/5 hover:border-white/30'
                          }`}
                        >
                          <div className="font-semibold">{opt.label}</div>
                          <div className="mt-1 text-sm text-emerald-100/80">{opt.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <p className="rounded-xl bg-white/10 px-4 py-3 text-sm text-emerald-50/95 ring-1 ring-white/15 leading-relaxed">
                Du kan altid ændre det senere under familieindstillinger.
              </p>
            </motion.div>
          )}

          {step === STEP.BREAKFAST_STYLE && (
            <motion.div key="breakfast-style" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Morgenmad</p>
                <h2 className="mt-1 text-2xl font-bold">Hvad er vigtigst om morgenen?</h2>
                <p className="mt-2 text-sm text-emerald-100/85">
                  {isKetoLikeDiet(data.dietaryApproach)
                    ? 'Keto-morgenmad er oftest æg, ost eller keto-rugbrød med pålæg.'
                    : 'Nogle har tid derhjemme. Andre skal bare ud af døren.'}
                </p>
              </div>
              <div className="space-y-3">
                {(['fast', 'home', 'repeat'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickAndAdvance({ breakfastStyle: id, mealPlanScope: 'full' })}
                    className={`flex w-full flex-col rounded-xl border-2 p-4 text-left transition ${
                      data.breakfastStyle === id
                        ? 'border-amber-300 bg-white/15'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <span className="font-semibold">{breakfastStyleLabel(id, data.dietaryApproach)}</span>
                    <span className="mt-1 text-sm text-emerald-100/80">
                      {breakfastStyleHint(id, data.dietaryApproach)}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === STEP.LUNCH_STYLE && (
            <motion.div key="lunch-style" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Frokost</p>
                <h2 className="mt-1 text-2xl font-bold">Hvordan skal frokosten fungere?</h2>
                <p className="mt-2 text-sm text-emerald-100/85">
                  {isKetoLikeDiet(data.dietaryApproach)
                    ? 'Keto-frokost er svær ude i byen. De fleste bruger keto-rugbrød, en preppet salat eller rester.'
                    : 'Rester, madpakke eller noget du laver derhjemme.'}
                </p>
              </div>
              <div className="space-y-3">
                {(['leftovers', 'packed', 'home'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickAndAdvance({ lunchStyle: id, mealPlanScope: 'full' })}
                    className={`flex w-full flex-col rounded-xl border-2 p-4 text-left transition ${
                      data.lunchStyle === id
                        ? 'border-amber-300 bg-white/15'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <span className="font-semibold">{lunchStyleLabel(id)}</span>
                    <span className="mt-1 text-sm text-emerald-100/80">
                      {lunchStyleHint(id, data.dietaryApproach)}
                    </span>
                  </button>
                ))}
              </div>
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

          {step === STEP.PRICING && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              <OnboardingPricingStep
                selected={selectedTier}
                onSelect={(plan) => {
                  setSelectedTier(plan)
                  saveCheckoutPlan(plan)
                }}
              />
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
                  { icon: Clock, text: `Måltider: ${onboardingMealSummary(data)}` },
                  { icon: Tag, text: `Kostretning: ${ONBOARDING_DIETARY_OPTIONS.find((d) => d.id === data.dietaryApproach)?.name ?? '—'}` },
                  { icon: Tag, text: `Butikker: ${data.selectedStores.map(storeName).filter(Boolean).join(', ')}` },
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
                <p className="mt-2 text-sm text-emerald-100/85">{signupPlanCopy()}</p>
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
                  <span className="mb-1 block text-xs font-medium text-emerald-100/80">Bekræft e-mail</span>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={emailConfirm}
                    onChange={(e) => setEmailConfirm(e.target.value)}
                    className="w-full rounded-xl border-0 bg-white/10 px-3 py-3 text-white ring-1 ring-white/20 focus:ring-2 focus:ring-amber-300"
                    placeholder="Skriv e-mailen igen"
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

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 rounded border-white/30 bg-white/10 text-amber-400 focus:ring-amber-300"
                  />
                  <span className="text-sm text-emerald-100/85">
                    Jeg accepterer{' '}
                    <Link href="/betingelser" className="underline text-amber-200" target="_blank">
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
                  <span className="text-sm leading-snug text-emerald-100/85">
                    Sig ja tak til en sjælden og personlig e-mail fra nicolaivarney, stifter af Functional Foods. Ingen reklamer.
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-emerald-100/70">
                    Henvisningskode (valgfrit)
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border-0 bg-white/10 px-3 py-2.5 text-sm text-white ring-1 ring-white/20 focus:ring-2 focus:ring-amber-300"
                    placeholder="Hvis en ven inviterede dig"
                  />
                </label>

                {turnstileSiteKey && <div ref={turnstileElRef} className="min-h-[65px]" />}
              </form>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/15" />
                <span className="text-xs font-medium text-emerald-100/60">eller</span>
                <div className="h-px flex-1 bg-white/15" />
              </div>

              <OAuthProviderButtons
                mode="signup"
                tier="free"
                redirectPath="/lav-din-plan"
                disabled={!acceptTerms || submitting}
                variant="dark"
                onBeforeRedirect={() => {
                  saveOAuthSignupPending({
                    tier: 'free',
                    productUpdatesConsent,
                    source: 'onboarding',
                    referralCode: normalizeReferralCode(referralCode),
                  })
                }}
                onError={(message) => setError(message)}
              />

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
              {submitting ? 'Opretter…' : 'Opret gratis konto'}
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
