'use client'

import { Check } from 'lucide-react'
import {
  FREE_MEAL_PLANS_PER_WEEK,
  FREE_PRICE_ALERTS_MAX,
  TIER_LABELS,
  TIER_PRICES_KR,
  type SubscriptionTier,
} from '@/lib/subscription-tiers'

export type SubscriptionPlanOption = {
  tier: SubscriptionTier
  title: string
  priceLabel: string
  description: string
  features: string[]
  recommended?: boolean
}

export const SUBSCRIPTION_PLAN_OPTIONS: SubscriptionPlanOption[] = [
  {
    tier: 'free',
    title: TIER_LABELS.free,
    priceLabel: '0 kr',
    description: 'Kom i gang med kernefunktionerne.',
    features: [
      `${FREE_MEAL_PLANS_PER_WEEK} madplaner om ugen`,
      `${FREE_PRICE_ALERTS_MAX} prisalarmer`,
      'Opskrifter og dagligvarer',
      'Maddagbog (manuel)',
    ],
  },
  {
    tier: 'plus',
    title: TIER_LABELS.plus,
    priceLabel: `${TIER_PRICES_KR.plus} kr/md`,
    description: 'Ubegrænset madplan ud fra tilbud.',
    features: [
      'Ubegrænset madplaner',
      'Ubegrænset prisalarmer',
      'Indkøbsliste med priser',
      'Besparelses-tracking',
    ],
    recommended: true,
  },
  {
    tier: 'premium',
    title: TIER_LABELS.premium,
    priceLabel: `${TIER_PRICES_KR.premium} kr/md`,
    description: 'Alt inkl. personlig vejledning.',
    features: [
      'Alt i Madbudget',
      'Personlig vejledning på Messenger',
      'Svar fra et menneske — 24/7',
      'Sparring om madplan og vægttab',
    ],
  },
]

type Props = {
  selected: SubscriptionTier
  onSelect: (tier: SubscriptionTier) => void
  compact?: boolean
}

export default function SubscriptionTierCards({ selected, onSelect, compact }: Props) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
      {SUBSCRIPTION_PLAN_OPTIONS.map((plan) => {
        const active = selected === plan.tier
        return (
          <button
            key={plan.tier}
            type="button"
            onClick={() => onSelect(plan.tier)}
            className={`relative rounded-2xl border-2 p-4 text-left transition ${
              active
                ? 'border-amber-300 bg-white/15 ring-2 ring-amber-300/40'
                : 'border-white/15 bg-white/5 hover:border-white/30'
            }`}
          >
            {plan.recommended ? (
              <span className="absolute -top-2.5 left-4 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
                Mest valgt
              </span>
            ) : null}
            <p className="text-sm font-bold text-white">{plan.title}</p>
            <p className="mt-0.5 text-lg font-extrabold text-amber-200">{plan.priceLabel}</p>
            <p className="mt-2 text-xs leading-relaxed text-emerald-100/85">{plan.description}</p>
            <ul className="mt-3 space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-emerald-50/95">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </button>
        )
      })}
    </div>
  )
}
