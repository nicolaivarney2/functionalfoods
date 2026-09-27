'use client'

import { Check, TrendingUp } from 'lucide-react'
import {
  COMMUNITY_PRICE_KR,
  TIER_LABELS,
  TIER_PRICES_KR,
  TRIAL_DAYS,
  type CheckoutPlan,
} from '@/lib/subscription-tiers'

const PLANS: {
  id: Exclude<CheckoutPlan, 'free'>
  name: string
  priceKr: number
  points: string[]
  note?: string
  research?: string
  recommended?: boolean
}[] = [
  {
    id: 'plus',
    name: TIER_LABELS.plus,
    priceKr: TIER_PRICES_KR.plus,
    points: [
      'Madplan ud fra tilbud og vægttabsplan',
      'Struktureret og effektivt vægttab',
      'Fuld adgang til madlog',
      'Indtal eller tag billede af mad, så det logges automatisk',
      'Spar 70-250 kr om ugen på mad med smarte madplaner',
    ],
  },
  {
    id: 'community',
    name: 'Community',
    priceKr: COMMUNITY_PRICE_KR,
    points: ['Alt fra Madbudget', 'Adgang til community'],
    note: 'Start et struktureret vægttabsforløb med 10 andre i et fortroligt rum, kun for jer. Med faglig sparring fra os, og hjælp fra hinanden.',
    research: 'Forskning viser, at 66 % holdt vægttabet, når de gjorde det sammen med andre. Alene var det 24 %.',
  },
  {
    id: 'premium',
    name: TIER_LABELS.premium,
    priceKr: TIER_PRICES_KR.premium,
    recommended: true,
    points: [
      'Alt fra Madbudget og Community',
      'Faglig vægttabscoaching fra FF',
      'Daglig sparring på messenger mellem 7.30 og 21.30 hver dag',
    ],
    note: 'Vi kender din plan, dine udfordringer, hjælper og støtter dig professionelt, så du lykkedes med dit vægttab. Telefonopkald også muligt.',
  },
]

type Props = {
  selected: CheckoutPlan
  onSelect: (plan: CheckoutPlan) => void
}

export default function OnboardingPricingStep({ selected, onSelect }: Props) {
  const plan = PLANS.find((item) => item.id === selected) ?? PLANS[0]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Prøv {TRIAL_DAYS} dage gratis</h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-100/85">Vælg den løsning, der passer dig.</p>
      </div>

      <div className="space-y-3">
        {PLANS.map((item) => {
          const active = selected === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`relative w-full rounded-2xl border-2 px-4 py-4 text-left transition ${
                active
                  ? 'border-amber-300 bg-white/15'
                  : 'border-white/15 bg-white/5 hover:border-white/30'
              }`}
            >
              {item.recommended ? (
                <span className="absolute -top-2 right-4 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
                  Mest valgt
                </span>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{item.name}</p>
                  <p className="mt-0.5 text-xs text-emerald-100/75">{TRIAL_DAYS} dages prøve</p>
                </div>
                <p className="shrink-0 text-lg font-extrabold text-amber-200">{item.priceKr} kr/md</p>
              </div>
              <ul className="mt-3 space-y-1.5">
                {item.points.map((line, index) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-emerald-50/95">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                    <span>{index > 0 && item.note ? `+ ${line}` : line}</span>
                  </li>
                ))}
              </ul>
              {item.note ? <p className="mt-3 text-sm leading-relaxed text-emerald-50/95">{item.note}</p> : null}
              {item.research ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-emerald-900">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p className="text-sm font-medium leading-snug">{item.research}</p>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>

      <p className="text-sm font-bold leading-relaxed text-white">
        Bemærk: Start {TRIAL_DAYS} dage gratis og se, hvad der fungerer for dig. Vi sender dig en mail dagen før, så
        du husker at opsige, hvis det ikke er noget for dig.
      </p>
      <p className="text-sm leading-relaxed text-white">
        {plan.name}. {TRIAL_DAYS} dage gratis, derefter {plan.priceKr} kr pr. måned.
      </p>
    </div>
  )
}
