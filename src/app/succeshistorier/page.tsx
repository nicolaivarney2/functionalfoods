'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

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

type Story = {
  id: string
  headline: string
  displayName: string
  dietaryApproach: string
  exercised: boolean
  storyText: string
  tipsText: string | null
  beforeWeightKg: number | null
  afterWeightKg: number | null
  durationWeeks: number | null
  reportedAt: string
  beforeImageUrl: string | null
  afterImageUrl: string | null
  weightLossKg: number
}

type Stats = {
  totalStories: number
  averageWeightLossKg: number
  withExerciseCount: number
  withoutExerciseCount: number
  avgWithExercise: number
  avgWithoutExercise: number
  topDietaryApproach: { diet: string; avgLoss: number; count: number } | null
}

const DIETARY_OPTIONS = [
  { value: 'keto', label: 'Keto' },
  { value: 'sense', label: 'Sense' },
  { value: 'glp-1', label: 'GLP-1 kost' },
  { value: 'anti-inflammatory', label: 'Anti-inflammatorisk' },
  { value: 'flexitarian', label: 'Fleksitarisk' },
  { value: '5-2-diet', label: '5:2 diæt' },
  { value: 'proteinrig-kost', label: 'Proteinrig kost' },
  { value: 'kalorietaelling', label: 'Kalorietælling' },
]

const MOCK_STORIES: Story[] = [
  {
    id: 'mock-1',
    headline: 'Fra aftensult til stabil energi hele dagen',
    displayName: 'Louise, 38',
    dietaryApproach: 'keto',
    exercised: true,
    storyText:
      'Jeg startede med at fokusere på mæthed og faste måltidsrutiner. Efter 3 uger stoppede mine cravings næsten helt, og jeg kunne holde planen uden at føle afsavn.',
    tipsText:
      'Planlæg 2-3 “sikre” måltider du altid kan lave. Det gjorde det let at holde kursen på travle dage.',
    beforeWeightKg: null,
    afterWeightKg: null,
    durationWeeks: 20,
    reportedAt: '2026-03-12',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    weightLossKg: 16,
  },
  {
    id: 'mock-2',
    headline: 'Sense gav ro i hverdagen og langsomt stabilt vægttab',
    displayName: 'Mette, 46',
    dietaryApproach: 'sense',
    exercised: false,
    storyText:
      'Jeg havde brug for noget, der passede til familielivet. Med portionsstyring og faste vaner tabte jeg mig støt uden at føle mig “på kur”.',
    tipsText: 'Tag billeder af dine tallerkener i starten. Det gav mig overblik over mine vaner.',
    beforeWeightKg: null,
    afterWeightKg: null,
    durationWeeks: 28,
    reportedAt: '2026-02-18',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1506863530036-1efeddceb993?auto=format&fit=crop&w=900&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80',
    weightLossKg: 14,
  },
  {
    id: 'mock-3',
    headline: 'GLP-1 inspireret kost hjalp mig med at holde mæthed',
    displayName: 'Anders, 34',
    dietaryApproach: 'glp-1',
    exercised: true,
    storyText:
      'Mit fokus var protein, grønt og simple måltider. Kombinationen af daglige gåture og høj mæthed gjorde det meget lettere at holde kalorieunderskud.',
    tipsText: 'Spis protein først i måltidet. Jeg blev hurtigere mæt og snackede mindre.',
    beforeWeightKg: null,
    afterWeightKg: null,
    durationWeeks: 32,
    reportedAt: '2026-04-01',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1506863530036-1efeddceb993?auto=format&fit=crop&w=900&q=80',
    weightLossKg: 21,
  },
]

function prettifyDiet(value: string) {
  const match = DIETARY_OPTIONS.find((opt) => opt.value === value)
  return match?.label || value
}

function buildStats(inputStories: Story[]): Stats {
  const totalStories = inputStories.length
  const averageWeightLossKg =
    totalStories > 0
      ? Number((inputStories.reduce((sum, item) => sum + item.weightLossKg, 0) / totalStories).toFixed(1))
      : 0
  const withExercise = inputStories.filter((s) => s.exercised)
  const withoutExercise = inputStories.filter((s) => !s.exercised)
  const byDiet = inputStories.reduce<Record<string, { totalLoss: number; count: number }>>((acc, story) => {
    const key = story.dietaryApproach || 'ukendt'
    acc[key] = acc[key] || { totalLoss: 0, count: 0 }
    acc[key].totalLoss += story.weightLossKg
    acc[key].count += 1
    return acc
  }, {})

  const topDiet = Object.entries(byDiet)
    .map(([diet, value]) => ({ diet, avgLoss: value.totalLoss / value.count, count: value.count }))
    .sort((a, b) => b.avgLoss - a.avgLoss)[0] || null

  return {
    totalStories,
    averageWeightLossKg,
    withExerciseCount: withExercise.length,
    withoutExerciseCount: withoutExercise.length,
    avgWithExercise:
      withExercise.length > 0
        ? Number((withExercise.reduce((sum, item) => sum + item.weightLossKg, 0) / withExercise.length).toFixed(1))
        : 0,
    avgWithoutExercise:
      withoutExercise.length > 0
        ? Number((withoutExercise.reduce((sum, item) => sum + item.weightLossKg, 0) / withoutExercise.length).toFixed(1))
        : 0,
    topDietaryApproach: topDiet ? { ...topDiet, avgLoss: Number(topDiet.avgLoss.toFixed(1)) } : null,
  }
}

export default function SuccessStoriesPage() {
  const { user, session, loading: authLoading } = useAuth()
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const turnstileElRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)

  const [stories, setStories] = useState<Story[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStories, setLoadingStories] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const [headline, setHeadline] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [dietaryApproach, setDietaryApproach] = useState('keto')
  const [exercised, setExercised] = useState<'yes' | 'no'>('yes')
  const [storyText, setStoryText] = useState('')
  const [tipsText, setTipsText] = useState('')
  const [weightLossKg, setWeightLossKg] = useState('')
  const [durationWeeks, setDurationWeeks] = useState('')
  const [reportedAt, setReportedAt] = useState(new Date().toISOString().slice(0, 10))
  const [beforeImage, setBeforeImage] = useState<File | null>(null)
  const [afterImage, setAfterImage] = useState<File | null>(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitInfo, setSubmitInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    async function loadStories() {
      setLoadingStories(true)
      setLoadError(null)
      try {
        const res = await fetch('/api/success-stories', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json.error || 'Kunne ikke hente succeshistorier')
        }
        if (!alive) return
        setStories(Array.isArray(json.stories) ? json.stories : [])
        setStats(json.stats || null)
      } catch (err) {
        if (!alive) return
        setLoadError(err instanceof Error ? err.message : 'Kunne ikke hente data')
      } finally {
        if (alive) setLoadingStories(false)
      }
    }
    loadStories()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!turnstileSiteKey || !showSubmitModal) return

    let cancelled = false
    const removeWidget = () => {
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current)
        } catch {
          // ignore
        }
      }
      turnstileWidgetIdRef.current = null
      setCaptchaToken('')
    }

    const renderWidget = () => {
      if (cancelled || !window.turnstile || !turnstileElRef.current || turnstileWidgetIdRef.current) return
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

    if (window.turnstile) {
      renderWidget()
      return removeWidget
    }

    const existing = document.querySelector('script[data-turnstile="true"]')
    if (existing) {
      existing.addEventListener('load', renderWidget, { once: true })
      return () => {
        existing.removeEventListener('load', renderWidget)
        removeWidget()
      }
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.turnstile = 'true'
    script.onload = renderWidget
    document.head.appendChild(script)

    return () => {
      cancelled = true
      removeWidget()
    }
  }, [turnstileSiteKey, showSubmitModal])

  const visibleStories = stories.length > 0 ? stories : MOCK_STORIES
  const visibleStats = stats || buildStats(visibleStories)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitInfo(null)

    if (!user || !session?.access_token) {
      setSubmitError('Du skal være logget ind for at indsende.')
      return
    }
    if (!beforeImage || !afterImage) {
      setSubmitError('Før- og efterbillede er påkrævet.')
      return
    }
    if (!headline.trim() || !displayName.trim() || !storyText.trim() || !weightLossKg) {
      setSubmitError('Udfyld overskrift, navn, historie og tabte kilo.')
      return
    }
    if (turnstileSiteKey && !captchaToken) {
      setSubmitError('Bekræft venligst, at du ikke er en robot.')
      return
    }

    setSubmitting(true)
    try {
      const payload = new FormData()
      payload.set('headline', headline.trim())
      payload.set('displayName', displayName.trim())
      payload.set('dietaryApproach', dietaryApproach)
      payload.set('exercised', exercised)
      payload.set('storyText', storyText.trim())
      payload.set('tipsText', tipsText.trim())
      payload.set('weightLossKg', weightLossKg)
      payload.set('durationWeeks', durationWeeks)
      payload.set('reportedAt', reportedAt)
      payload.set('beforeImage', beforeImage)
      payload.set('afterImage', afterImage)
      if (captchaToken) payload.set('captchaToken', captchaToken)

      const res = await fetch('/api/success-stories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: payload,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detailed = [json.error, json.details].filter(Boolean).join(' ')
        throw new Error(detailed || 'Kunne ikke indsende succeshistorie')
      }

      setSubmitInfo(json.message || 'Tak! Din historie er sendt til godkendelse.')
      setHeadline('')
      setDisplayName('')
      setStoryText('')
      setTipsText('')
      setWeightLossKg('')
      setDurationWeeks('')
      setBeforeImage(null)
      setAfterImage(null)
      setShowSubmitModal(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Noget gik galt')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white">
        <div className="container py-10 sm:py-14">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
              Vægttabs succeshistorier
            </p>
            <h1 className="mt-4 text-3xl sm:text-5xl font-bold leading-tight">
              Læs andre succeshistorier
            </h1>
            <p className="mt-4 max-w-3xl text-sm sm:text-base text-emerald-50 leading-relaxed">
              Her deler vi selvrapporterede vægttabsrejser, før/efter billeder, tabte kg og hvilke
              vægttabsmetode der er brugt. Det kan bruges som inspiration. Har du en god vægttabshistorie,
              så log ind og tilføj den.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                Del din egen succeshistorie
              </button>
              {!user ? (
                <Link
                  href="/kom-i-gang"
                  className="inline-flex items-center rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Opret bruger / log ind
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="container">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Godkendte historier</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{visibleStats.totalStories}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Gennemsnitligt vægttab</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{visibleStats.averageWeightLossKg} kg</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Top kostniche (gns.)</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {visibleStats.topDietaryApproach
                  ? `${prettifyDiet(visibleStats.topDietaryApproach.diet)} (${visibleStats.topDietaryApproach.avgLoss} kg)`
                  : 'Ingen data endnu'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Motion vs. ingen motion</p>
              <p className="mt-1 text-sm text-slate-800">
                {visibleStats.avgWithExercise} kg vs. {visibleStats.avgWithoutExercise} kg
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-8">
        <div className="container grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {loadingStories && <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">Indlæser succeshistorier...</div>}
            {loadError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                {loadError}. Viser eksempeldata indtil live-historier er klar.
              </div>
            )}

            {visibleStories.map((story) => (
              <article
                key={story.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">Før</div>
                    {story.beforeImageUrl ? (
                      <img
                        src={story.beforeImageUrl}
                        alt={`Før billede fra ${story.displayName}`}
                        className="w-full aspect-[9/16] rounded-xl object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="w-full aspect-[9/16] rounded-xl bg-slate-100" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">Efter</div>
                    {story.afterImageUrl ? (
                      <img
                        src={story.afterImageUrl}
                        alt={`Efter billede fra ${story.displayName}`}
                        className="w-full aspect-[9/16] rounded-xl object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="w-full aspect-[9/16] rounded-xl bg-slate-100" />
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800 font-semibold">
                    {story.weightLossKg} kg tabt
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-800 font-medium">
                    {prettifyDiet(story.dietaryApproach)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 font-medium">
                    Motion: {story.exercised ? 'Ja' : 'Nej'}
                  </span>
                </div>

                <h2 className="mt-4 text-xl sm:text-2xl font-bold text-slate-900">{story.headline}</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">{story.displayName}</p>
                <p className="mt-2 text-slate-700 leading-relaxed whitespace-pre-line">{story.storyText}</p>
                {story.tipsText ? (
                  <p className="mt-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Bedste tips:</span> {story.tipsText}
                  </p>
                ) : null}
                <p className="mt-3 text-xs sm:text-sm text-slate-500">
                  {story.durationWeeks ? `${story.durationWeeks} uger` : 'Varighed ikke oplyst'} • Indberettet {story.reportedAt}
                </p>
              </article>
            ))}
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Klar til din egen historie?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Din historie kan være præcis det, der hjælper en anden i gang. Vi modererer alt før publicering.
              </p>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Del din succeshistorie
              </button>
              {!authLoading && !user ? (
                <Link
                  href="/kom-i-gang"
                  className="mt-3 inline-flex w-full justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Opret bruger / log ind
                </Link>
              ) : null}
              {submitInfo ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {submitInfo}
                </div>
              ) : null}
              <p className="mt-4 text-xs text-slate-500">
                Data er selvindberettet og ikke repræsentativt. Brug siden til motivation og inspiration.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {showSubmitModal && (
        <div className="fixed inset-0 z-[120]">
          <div
            className="absolute inset-0 bg-slate-900/70"
            onClick={() => setShowSubmitModal(false)}
          />
          <div className="absolute inset-0 overflow-y-auto p-3 sm:p-6">
            <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Indsend succeshistorie</h3>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Luk
                </button>
              </div>

              <form className="space-y-3 px-5 py-5" onSubmit={handleSubmit}>
                {!authLoading && !user && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Du skal være logget ind for at indsende.
                  </div>
                )}
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Overskrift (fx: Sådan tabte jeg 12 kg på keto)"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  required
                />
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Navn eller kaldenavn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={dietaryApproach}
                  onChange={(e) => setDietaryApproach(e.target.value)}
                >
                  {DIETARY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Hvor mange kilo har du tabt? (fx 12.5)"
                  value={weightLossKg}
                  onChange={(e) => setWeightLossKg(e.target.value)}
                  required
                />
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Hvor mange uger? (valgfrit)"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                />
                <label className="text-xs text-slate-600 block">
                  Dato for rapportering
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={reportedAt}
                    onChange={(e) => setReportedAt(e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <label className="block">
                    Før-billede (krav)
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 block w-full text-xs"
                      onChange={(e) => setBeforeImage(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                  <label className="block">
                    Efter-billede (krav)
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 block w-full text-xs"
                      onChange={(e) => setAfterImage(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>
                <div className="flex gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="motion"
                      checked={exercised === 'yes'}
                      onChange={() => setExercised('yes')}
                    />
                    Motion ja
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="motion"
                      checked={exercised === 'no'}
                      onChange={() => setExercised('no')}
                    />
                    Motion nej
                  </label>
                </div>
                <textarea
                  className="w-full min-h-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Din historie (hvad virkede for dig?)"
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  required
                />
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Bedste tips/tricks (valgfrit)"
                  value={tipsText}
                  onChange={(e) => setTipsText(e.target.value)}
                />
                {turnstileSiteKey && <div ref={turnstileElRef} className="overflow-hidden" />}
                {submitError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                    {submitError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting || authLoading || !user}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sender...' : 'Send succeshistorie'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
