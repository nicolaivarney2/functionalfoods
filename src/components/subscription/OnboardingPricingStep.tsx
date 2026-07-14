'use client'

import { Check } from 'lucide-react'
import HealthInformationNotice from '@/components/HealthInformationNotice'
import {
  PREMIUM_CONSIDERATION_NOTE,
  TIER_LABELS,
  TIER_PRICES_KR,
  type SubscriptionTier,
} from '@/lib/subscription-tiers'

const CORE_FEATURES = [
  'Madplan ud fra ugens tilbud i dine butikker',
  'Opskrifter og dagligvarer til dit mål',
  'Maddagbog, vægttracker og prisalarmer',
] as const

const TIERS: {
  tier: SubscriptionTier
  priceLabel: string
  tagline: string
  recommended?: boolean
}[] = [
  {
    tier: 'free',
    priceLabel: '0 kr',
    tagline: '3 madplaner og 3 prisalarmer om ugen',
  },
  {
    tier: 'plus',
    priceLabel: `${TIER_PRICES_KR.plus} kr/md`,
    tagline: 'Ubegrænset madplan og prisalarmer',
    recommended: true,
  },
  {
    tier: 'premium',
    priceLabel: `${TIER_PRICES_KR.premium} kr/md`,
    tagline: 'Alt i Madbudget + personlig vejledning',
  },
]

type Props = {
  selected: SubscriptionTier
  onSelect: (tier: SubscriptionTier) => void
}

export default function OnboardingPricingStep({ selected, onSelect }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Vælg plan</p>
        <h2 className="mt-1 text-2xl font-bold">Hvad passer til dig?</h2>
      </div>

      <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90">Kernefunktioner</p>
        <ul className="mt-3 space-y-2">
          {CORE_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-emerald-50/95">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-emerald-100/85">
          Værktøjerne samler <strong className="font-semibold text-white">plan, indkøb og opskrifter</strong> — så du
          slipper for at gætte hver aften.
        </p>
      </div>

      <div className="space-y-2">
        {TIERS.map((plan) => {
          const active = selected === plan.tier
          return (
            <button
              key={plan.tier}
              type="button"
              onClick={() => onSelect(plan.tier)}
              className={`relative w-full rounded-2xl border-2 px-4 py-3.5 text-left transition ${
                active
                  ? 'border-amber-300 bg-white/15 ring-2 ring-amber-300/40'
                  : 'border-white/15 bg-white/5 hover:border-white/30'
              }`}
            >
              {plan.recommended ? (
                <span className="absolute -top-2 right-4 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
                  Mest valgt
                </span>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{TIER_LABELS[plan.tier]}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-emerald-100/85">{plan.tagline}</p>
                </div>
                <p className="shrink-0 text-base font-extrabold text-amber-200">{plan.priceLabel}</p>
              </div>
            </button>
          )
        })}
      </div>

      <p className="rounded-xl bg-amber-400/15 px-4 py-3 text-sm leading-relaxed text-emerald-50/95 ring-1 ring-amber-300/25">
        {PREMIUM_CONSIDERATION_NOTE}
      </p>

      <p className="text-xs leading-relaxed text-emerald-100/70">
        Abonnement kan opsiges når som helst. Betaling først efter du har oprettet konto i næste trin.
      </p>

      <HealthInformationNotice variant="dark" />
    </div>
  )
}
