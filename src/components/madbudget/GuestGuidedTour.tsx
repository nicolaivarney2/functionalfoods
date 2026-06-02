'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Scale,
  Sparkles,
  Store,
  Target,
  Users,
  Utensils,
  X,
} from 'lucide-react'
import {
  GUEST_DEMO_ADULT_PROFILES,
  GUEST_DEMO_DIETARY_OPTIONS,
} from '@/lib/madbudget/guest-demo-data'
import { ActivityLevel, WeightGoal } from '@/lib/dietary-system'

export type GuestTourFamilyState = {
  adults: number
  children: number
  childrenAges: string[]
  selectedStores: number[]
  excludedIngredients: string[]
  /** Mad-niche for hele madplanen (demo: keto). */
  planDietaryApproach: string
}

const STORE_OPTIONS = [
  { id: 1, name: 'REMA 1000', color: 'bg-blue-600' },
  { id: 2, name: 'Netto', color: 'bg-yellow-500' },
  { id: 3, name: 'Føtex', color: 'bg-blue-500' },
  { id: 4, name: 'Bilka', color: 'bg-blue-700' },
  { id: 5, name: 'Nemlig.com', color: 'bg-orange-500' },
  { id: 6, name: 'MENY', color: 'bg-red-600' },
  { id: 7, name: 'Spar', color: 'bg-red-500' },
  { id: 8, name: 'Løvbjerg', color: 'bg-green-600' },
] as const

const EXCLUDED_OPTIONS = [
  { id: 'red-meat', label: 'Rødt kød' },
  { id: 'poultry', label: 'Fjerkræ' },
  { id: 'pork', label: 'Svinekød' },
  { id: 'fish', label: 'Fisk' },
  { id: 'eggs', label: 'Æg' },
  { id: 'shellfish', label: 'Skaldyr' },
  { id: 'nuts', label: 'Nødder' },
  { id: 'dairy', label: 'Mælkeprodukter' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'soy', label: 'Soja' },
] as const

const STEPS = [
  { id: 'family', label: 'Familie' },
  { id: 'niche', label: 'Mad-niche' },
  { id: 'profiles', label: 'Vægttab' },
  { id: 'stores', label: 'Butikker' },
  { id: 'preferences', label: 'Fravalg' },
  { id: 'features', label: 'Klar' },
] as const

const ACTIVITY_LABELS: Record<number, string> = {
  [ActivityLevel.Sedentary]: 'Stillesiddende',
  [ActivityLevel.LightlyActive]: 'Lidt aktiv',
  [ActivityLevel.ModeratelyActive]: 'Moderat aktiv',
  [ActivityLevel.VeryActive]: 'Meget aktiv',
  [ActivityLevel.ExtremelyActive]: 'Ekstremt aktiv',
}

const WEIGHT_GOAL_LABELS: Record<string, string> = {
  [WeightGoal.WeightLoss]: 'Vægttab',
  [WeightGoal.Maintenance]: 'Vedligehold',
  [WeightGoal.MuscleGain]: 'Muskeløgning',
}

function DemoHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-green-300 bg-green-50/80 px-4 py-3 text-sm text-green-900">
      {children}
    </p>
  )
}

type GuestGuidedTourProps = {
  open: boolean
  initial: GuestTourFamilyState
  onClose: () => void
  onApply: (state: GuestTourFamilyState) => void
}

export default function GuestGuidedTour({
  open,
  initial,
  onClose,
  onApply,
}: GuestGuidedTourProps) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<GuestTourFamilyState>(initial)

  useEffect(() => {
    if (open) {
      setDraft(initial)
      setStep(0)
    }
  }, [open, initial])

  const familyPe = useMemo(() => {
    const adultPe = draft.adults * 1.0
    const childPe = draft.childrenAges.reduce((sum, band) => {
      if (band === '0-3' || band === '4-8') return sum + 0.5
      return sum + 1.0
    }, 0)
    return Math.max(1, adultPe + childPe)
  }, [draft])

  const adultProfilePreviews = useMemo(() => {
    const count = Math.max(1, Math.min(10, draft.adults))
    return Array.from({ length: count }, (_, i) => {
      const template = GUEST_DEMO_ADULT_PROFILES[i] ?? GUEST_DEMO_ADULT_PROFILES[0]
      return {
        index: i,
        ...template,
        id: `guest-adult-${i + 1}`,
        dietaryApproach: draft.planDietaryApproach,
      }
    })
  }, [draft.adults, draft.planDietaryApproach])

  const selectedNiche = GUEST_DEMO_DIETARY_OPTIONS.find((o) => o.id === draft.planDietaryApproach)

  if (!open) return null

  const setChildrenCount = (count: number) => {
    const clamped = Math.max(0, Math.min(10, count))
    setDraft((prev) => {
      const ages = [...prev.childrenAges]
      while (ages.length < clamped) ages.push('4-8')
      ages.length = clamped
      return { ...prev, children: clamped, childrenAges: ages }
    })
  }

  const setAdults = (count: number) => {
    const clamped = Math.max(1, Math.min(10, count))
    setDraft((prev) => ({ ...prev, adults: clamped }))
  }

  const setChildAge = (index: number, age: string) => {
    setDraft((prev) => {
      const next = [...prev.childrenAges]
      next[index] = age
      return { ...prev, childrenAges: next }
    })
  }

  const toggleStore = (storeId: number) => {
    setDraft((prev) => ({
      ...prev,
      selectedStores: prev.selectedStores.includes(storeId)
        ? prev.selectedStores.filter((id) => id !== storeId)
        : [...prev.selectedStores, storeId],
    }))
  }

  const toggleExcluded = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      excludedIngredients: prev.excludedIngredients.includes(id)
        ? prev.excludedIngredients.filter((x) => x !== id)
        : [...prev.excludedIngredients, id],
    }))
  }

  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      onApply(draft)
      return
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        className="flex max-h-[min(94vh,900px)] w-full max-w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-tour-title"
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-green-50 via-white to-emerald-50 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
              <Sparkles size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 id="guest-tour-title" className="text-lg font-semibold text-gray-900">
                Din vægttabsplan — hurtig intro
              </h3>
              <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">
                Som i Familieindstillinger når du er bruger: familie, mad-niche, vægttabsprofiler og
                butikker. I demo er det meste udfyldt — tryk Næste.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Luk"
            onClick={onClose}
            className="-m-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-white/70 hover:text-gray-800"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-gray-100 bg-white px-5 py-3 sm:px-6">
          <ol className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] font-medium text-gray-500 sm:gap-2 sm:text-xs">
            {STEPS.map((s, i) => {
              const active = i === step
              const done = i < step
              return (
                <li key={s.id} className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] sm:h-6 sm:w-6 sm:text-xs ${
                      done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : active
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 bg-white text-gray-500'
                    }`}
                    aria-hidden
                  >
                    {done ? <Check size={12} /> : i + 1}
                  </span>
                  <span className={`whitespace-nowrap ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="hidden h-px w-3 bg-gray-200 sm:inline-block" aria-hidden />
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step-family" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <Users size={18} aria-hidden />
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Familie og portioner</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Samme som under Familieindstillinger → Madprofiler. Vi skalerer madplan og
                      indkøb til jeres husstand.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">Antal voksne</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={draft.adults}
                      onChange={(e) => setAdults(parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">Antal børn</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={draft.children}
                      onChange={(e) => setChildrenCount(parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                    />
                  </label>
                </div>
                {draft.children > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-3 text-sm font-medium text-gray-800">Børnenes aldre</p>
                    <div className="space-y-2">
                      {Array.from({ length: draft.children }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-16 shrink-0 text-sm text-gray-600">Barn {i + 1}</span>
                          <select
                            value={draft.childrenAges[i] || '4-8'}
                            onChange={(e) => setChildAge(i, e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                          >
                            <option value="0-3">0–3 år (0,5 portion)</option>
                            <option value="4-8">4–9 år (0,5 portion)</option>
                            <option value="8+">10+ år (1 portion)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-900">
                  I alt <strong>{familyPe.toFixed(1).replace('.', ',')} portioner</strong> i demo-familien.
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step-niche" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Target size={18} aria-hidden />
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Mad-niche for madplanen</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Functional Foods handler om vægttab med den kostretning, der passer til dig — ikke
                      bare familiemad. Hele planen filtreres efter niche.
                    </p>
                  </div>
                </div>
                <DemoHint>
                  Demo er sat til <strong>Keto</strong>. Som bruger vælger du selv under
                  Familieindstillinger — her trykker du bare <strong>Næste</strong>.
                </DemoHint>
                <div className="grid grid-cols-1 gap-2">
                  {GUEST_DEMO_DIETARY_OPTIONS.map((approach) => {
                    const selected = draft.planDietaryApproach === approach.id
                    return (
                      <div
                        key={approach.id}
                        className={`flex items-center rounded-lg border p-3 ${
                          selected
                            ? 'border-green-500 bg-green-50 ring-1 ring-green-500/30'
                            : 'border-gray-200 bg-gray-50/80 opacity-60'
                        }`}
                      >
                        <span
                          className={`mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'
                          }`}
                          aria-hidden
                        >
                          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{approach.name}</div>
                          <div className="text-xs text-gray-600">{approach.desc}</div>
                        </div>
                        {selected && (
                          <span className="ml-auto shrink-0 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Demo
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedNiche && (
                  <p className="text-xs text-gray-500">
                    Madplan og indkøb i demo er tilpasset <strong>{selectedNiche.name}</strong> og ugens
                    tilbud.
                  </p>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step-profiles" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Scale size={18} aria-hidden />
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Vægttabsprofiler</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Hver voksen får vægt, højde, aktivitet og mål — så kalorier og protein passer til
                      vægttabsrejsen. Det er kernen i FF.
                    </p>
                  </div>
                </div>
                <DemoHint>
                  Profilerne er allerede udfyldt i demo. Som bruger klikker du «Udfyld profil» under
                  Familieindstillinger.
                </DemoHint>
                <div className="space-y-3">
                  {adultProfilePreviews.map((profile, index) => (
                    <div
                      key={profile.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900">Voksen {index + 1}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle size={14} aria-hidden />
                          Udfyldt (demo)
                        </span>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <dt className="text-xs text-gray-500">Køn</dt>
                          <dd className="font-medium text-gray-900">
                            {profile.gender === 'male' ? 'Mand' : 'Kvinde'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Alder</dt>
                          <dd className="font-medium text-gray-900">{profile.age} år</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Vægt / højde</dt>
                          <dd className="font-medium text-gray-900">
                            {profile.weight} kg · {profile.height} cm
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Aktivitet</dt>
                          <dd className="font-medium text-gray-900">
                            {profile.activityLevel != null
                              ? ACTIVITY_LABELS[profile.activityLevel] ?? 'Moderat aktiv'
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Mål</dt>
                          <dd className="font-medium text-green-700">
                            {profile.weightGoal
                              ? WEIGHT_GOAL_LABELS[profile.weightGoal] ?? 'Vægttab'
                              : 'Vægttab'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Måltider</dt>
                          <dd className="font-medium text-gray-900">Morgenmad, frokost, aftensmad</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step-stores" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Store size={18} aria-hidden />
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Butikker og tilbud</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      FF bygger madplanen ud fra <strong>ugens tilbud</strong> i dine butikker — nemt,
                      billigt og effektivt til vægttab.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {STORE_OPTIONS.map((store) => {
                    const checked = draft.selectedStores.includes(store.id)
                    return (
                      <label
                        key={store.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                          checked
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStore(store.id)}
                          className="rounded text-green-600"
                        />
                        <span className={`h-4 w-4 shrink-0 rounded-full ${store.color}`} aria-hidden />
                        <span className="text-sm text-gray-800">{store.name}</span>
                      </label>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step-preferences" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Utensils size={18} aria-hidden />
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Fravalg (valgfrit)</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      I demo er ingen fravalg valgt — tryk Næste, eller markér noget I vil se i
                      introen.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {EXCLUDED_OPTIONS.map((opt) => {
                    const checked = draft.excludedIngredients.includes(opt.id)
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2.5 ${
                          checked ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExcluded(opt.id)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-800">{opt.label}</span>
                      </label>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step-features" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <Sparkles size={18} aria-hidden />
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Klar til din demo-madplan</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Det I ser nu er det samme flow som loggede brugere — med vægttab, mad-niche og
                      tilbud i centrum.
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  <FeatureItem
                    icon={<Scale size={16} />}
                    title="Vægttab først"
                    desc="Profiler, kalorier og protein mod dit mål — ikke generisk familiemad."
                  />
                  <FeatureItem
                    icon={<Target size={16} />}
                    title="Mad-niche (fx Keto)"
                    desc="Hele planen følger din valgte kostretning."
                  />
                  <FeatureItem
                    icon={<Store size={16} />}
                    title="Billigt"
                    desc="Madplan og indkøb fra ugens tilbud i dine butikker."
                  />
                  <FeatureItem
                    icon={<Calendar size={16} />}
                    title="Nemt og effektivt"
                    desc="Morgenmad, frokost og aftensmad — ét klik til ny uge, lås favoritter."
                  />
                  <FeatureItem
                    icon={<PieChart size={16} />}
                    title="Ernæringsoverblik"
                    desc="Vejledende tal til vægttab uden kalorie-fixering."
                  />
                </ul>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Tryk <strong>Gå til min madplan</strong> — derefter kan du tage den guidede tour på
                  siden.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
            type="button"
            onClick={step === 0 ? onClose : handleBack}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ChevronLeft size={18} aria-hidden />
            {step === 0 ? 'Luk' : 'Tilbage'}
          </button>
          <div className="hidden text-xs text-gray-500 sm:block">
            Trin {step + 1} af {STEPS.length}
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            {isLast ? (
              <>
                <CheckCircle size={18} aria-hidden />
                Gå til min madplan
              </>
            ) : (
              <>
                Næste
                <ChevronRight size={18} aria-hidden />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-600">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">{desc}</p>
      </div>
    </li>
  )
}
