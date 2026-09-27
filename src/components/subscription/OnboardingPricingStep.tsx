'use client'

import { Check } from 'lucide-react'
import HealthInformationNotice from '@/components/HealthInformationNotice'
import PremiumConsiderationNote from '@/components/subscription/PremiumConsiderationNote'
import {
  COMMUNITY_PRICE_KR,
  TIER_LABELS,
  TIER_PRICES_KR,
  TRIAL_DAYS,
  type CheckoutPlan,
} from '@/lib/subscription-tiers'

const PLANS: {
  id: CheckoutPlan
  name: string
  priceLabel: string
  tagline: string
  recommended?: boolean
}[] = [
  {
    id: 'premium',
    name: TIER_LABELS.premium,
    priceLabel: `${TIER_PRICES_KR.premium} kr/md`,
    tagline: 'Alt i Community, plus personlig vejledning på Messenger',
    recommended: true,
  },
  {
    id: 'community',
    name: 'Community',
    priceLabel: `${COMMUNITY_PRICE_KR} kr/md`,
    tagline: 'Rummene i appen og alt i Madbudget',
  },
  {
    id: 'plus',
    name: TIER_LABELS.plus,
    priceLabel: `${TIER_PRICES_KR.plus} kr/md`,
    tagline: 'Ubegrænset madplan, madlog og prisalarmer',
  },
  {
    id: 'free',
    name: 'Uden abonnement',
    priceLabel: '0 kr',
    tagline: '3 madplaner og 3 prisalarmer om ugen',
  },
]

type Props = {
  selected: CheckoutPlan
  onSelect: (plan: CheckoutPlan) => void
}

export default function OnboardingPricingStep({ selected, onSelect }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Vælg plan</p>
        <h2 className="mt-1 text-2xl font-bold">De første {TRIAL_DAYS} dage følger planen</h2>
      </div>

      <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
        <p className="text-sm leading-relaxed text-emerald-100/85">
          Vælger du Madbudget, får du madplan og madlog. Vælger du Community, får du også rummene i appen.
          Vælger du Premium, får du vejledning på Messenger oveni. Uden abonnement er det 3 madplaner og 3
          prisalarmer om ugen.
        </p>
      </div>

      <div className="space-y-2">
        {PLANS.map((plan) => {
          const active = selected === plan.id
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id)}
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
                  <p className="text-sm font-bold text-white">{plan.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-emerald-100/85">{plan.tagline}</p>
                </div>
                <p className="shrink-0 text-base font-extrabold text-amber-200">{plan.priceLabel}</p>
              </div>
              {active ? (
                <ul className="mt-3 space-y-1.5">
                  {detailsFor(plan.id).map((line) => (
                    <li key={line} className="flex items-start gap-2 text-xs text-emerald-50/95">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </button>
          )
        })}
      </div>

      {selected === 'premium' ? <PremiumConsiderationNote variant="dark" /> : null}

      <p className="text-xs leading-relaxed text-emerald-100/70">
        Vælger du Madbudget, Community eller Premium, betaler du efter oprettelse. Opsig når som helst. Rummene
        åbner du i appen.
      </p>

      <HealthInformationNotice variant="dark" />
    </div>
  )
}

function detailsFor(plan: CheckoutPlan): string[] {
  if (plan === 'premium') {
    return [
      `Først ${TRIAL_DAYS} dage med Premium`,
      'Alt i Community og Madbudget',
      'Personlig vejledning på Messenger, 7.30-21.30',
    ]
  }
  if (plan === 'community') {
    return [
      `Først ${TRIAL_DAYS} dage med Community`,
      'Grupper à 10 i appen, med fast startdato',
      'Madplan, madlog og prisalarmer som i Madbudget',
      'Personlig vejledning er Premium',
    ]
  }
  if (plan === 'plus') {
    return [
      `Først ${TRIAL_DAYS} dage med Madbudget`,
      'Ubegrænset madplan og madlog',
      'Prisalarmer og indkøbsliste med tilbud',
      'Åbner ikke community-rummene',
    ]
  }
  return ['3 madplaner om ugen', '3 prisalarmer', 'Ingen community-rum og ingen Messenger-vejledning']
}
