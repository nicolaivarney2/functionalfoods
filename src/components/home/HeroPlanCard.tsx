'use client'

import Image from 'next/image'
import { TrendingDown, ShoppingCart } from 'lucide-react'
import {
  GUEST_DEMO_HOMEPAGE_MEALS,
  GUEST_DEMO_HOMEPAGE_SAVINGS_KR,
  GUEST_DEMO_HOMEPAGE_TOTAL_KR,
  GUEST_DEMO_HOMEPAGE_PRICE_PER_PORTION,
} from '@/lib/madbudget/guest-demo-data'

/**
 * Hero-illustration: Planomo-inspireret mockup med rigtige demo-opskrifter.
 * Kompakt — skal understøtte hero-teksten, ikke dominere den.
 */
export default function HeroPlanCard() {
  return (
    <div className="relative w-full min-w-0 lg:ml-auto lg:max-w-[460px]">
      <div className="overflow-hidden rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-black/10 sm:rounded-2xl">
        {/* Header */}
        <div className="border-b border-stone-100 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Uge 23 · Din vægttabsplan
              </p>
              <h3 className="mt-0.5 text-base font-extrabold leading-tight text-gray-900 sm:text-lg">
                5 aftensmåltider
              </h3>
              <p className="mt-0.5 text-xs text-gray-600">
                Bygget på ugens tilbud i{' '}
                <span className="font-semibold text-amber-600">Netto</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Du sparer</p>
              <p className="text-xl font-extrabold leading-none text-amber-600">
                {GUEST_DEMO_HOMEPAGE_SAVINGS_KR} kr.
              </p>
            </div>
          </div>

          {/* Vægtmål + pris — kompakt */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-50 px-2.5 py-2 ring-1 ring-emerald-100">
              <p className="flex items-center gap-1 text-sm font-extrabold leading-none text-emerald-800">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                0,5 kg
              </p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                pr. uge
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 px-2.5 py-2 ring-1 ring-amber-100">
              <p className="text-sm font-extrabold leading-none text-amber-800">
                {GUEST_DEMO_HOMEPAGE_PRICE_PER_PORTION} kr.
              </p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                pr. portion
              </p>
            </div>
          </div>
        </div>

        {/* Måltider */}
        <ul className="flex flex-col gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3">
          {GUEST_DEMO_HOMEPAGE_MEALS.map((meal) => (
            <li
              key={meal.slug}
              className="flex items-center gap-2.5 rounded-lg bg-amber-50/70 px-3 py-2 ring-1 ring-amber-100/80"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                {meal.image ? (
                  <Image
                    src={meal.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-[10px] font-bold text-emerald-700">
                    {meal.day}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-900">
                  <span className="uppercase text-emerald-700">{meal.day}</span>
                  <span className="mx-1 text-stone-300">·</span>
                  {meal.name}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-600">
                  <span className="font-bold text-emerald-700">{meal.kcal} kcal</span>
                  <span className="mx-1 text-stone-300">·</span>
                  <span>{meal.priceKr} kr/pers</span>
                </p>
              </div>
              {meal.tilbud && (
                <span className="shrink-0 rounded-full bg-amber-200/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-900">
                  Tilbud
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="flex items-center gap-1.5 border-t border-stone-100 bg-stone-50 px-4 py-2.5 sm:px-5">
          <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          <span className="text-xs font-semibold text-gray-700">Indkøbsliste klar</span>
          <span className="ml-auto text-xs font-bold text-emerald-700">
            {GUEST_DEMO_HOMEPAGE_TOTAL_KR} kr. i alt
          </span>
        </div>
      </div>
    </div>
  )
}
