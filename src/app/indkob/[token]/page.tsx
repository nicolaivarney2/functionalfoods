'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, ShoppingCart, Store, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { sortShoppingCategoriesForStore } from '@/lib/shopping-list-order'
import { formatPurchaseHint } from '@/lib/smart-shopping-display'

type ShopPayload = {
  categories?: Array<{ name: string; items?: Array<Record<string, unknown>> }>
}

type MealDaySummary = {
  dayLabel: string
  meals: Array<{ slot: string; title: string | null }>
}

function formatQty(value: unknown) {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(num)) return String(value ?? '')
  const rounded = parseFloat(Number(num).toFixed(2))
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1).replace('.', ',')
}

export default function IndkobTokenPage() {
  const params = useParams()
  const token = params?.token as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    storeName: string
    storeKey: string
    shoppingList: ShopPayload
    shoppingListPrices: Record<string, Record<string, unknown>> | null
    mealSummary: { title?: string; days?: MealDaySummary[] } | null
  } | null>(null)

  const storageKey = useMemo(() => (token ? `ff_indkob_checked_${token}` : ''), [token])
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activePanel, setActivePanel] = useState(0)

  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setChecked(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const toggle = useCallback(
    (key: string) => {
      setChecked((prev) => {
        const next = { ...prev, [key]: !prev[key] }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [storageKey]
  )

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Ugyldigt link')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/smart-shopping/${encodeURIComponent(token)}`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || 'Kunne ikke hente listen')
          return
        }
        setData(json.data)
      } catch {
        if (!cancelled) setError('Netværksfejl')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const sortedCategories = useMemo(() => {
    if (!data?.shoppingList?.categories) return []
    return sortShoppingCategoriesForStore(data.shoppingList.categories as { name: string }[])
  }, [data])

  const pricesForStore = data?.shoppingListPrices?.[data.storeKey] as
    | Record<string, Record<string, unknown>>
    | undefined

  const mealDays = data?.mealSummary?.days
  const hasMealPlanPanel = useMemo(() => {
    if (!mealDays?.length) return false
    return mealDays.some((d) => d.meals?.some((m) => m.title && String(m.title).trim().length > 0))
  }, [mealDays])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || !hasMealPlanPanel) return
    const onScroll = () => {
      const w = el.clientWidth
      if (w <= 0) return
      const i = Math.round(el.scrollLeft / w)
      setActivePanel(Math.min(1, Math.max(0, i)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [hasMealPlanPanel, data])

  const scrollToPanel = (i: number) => {
    const el = scrollerRef.current
    if (!el) return
    const w = el.clientWidth
    el.scrollTo({ left: i * w, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-700 font-medium">{error || 'Ukendt fejl'}</p>
        <Link href="/" className="mt-4 text-emerald-700 underline">
          Til forsiden
        </Link>
      </div>
    )
  }

  const listSection = (
    <div className="bg-white rounded-2xl shadow-xl text-slate-900 overflow-hidden">
      <div className="bg-emerald-600 px-4 py-3 flex items-center gap-2 text-white">
        <ShoppingCart className="w-5 h-5" />
        <span className="font-semibold">Indkøbsliste</span>
      </div>
      <div className="p-4 space-y-6">
        {sortedCategories.map((category, catIndex) => {
          const items = (category as { items?: unknown[] }).items || []
          if (items.length === 0) return null
          return (
            <div
              key={`${category.name}-${catIndex}`}
              className="border-b border-slate-100 last:border-0 pb-5 last:pb-0"
            >
              <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide mb-3">{category.name}</h2>
              <ul className="space-y-2">
                {(items as Record<string, unknown>[]).map((item, itemIndex) => {
                  const name = String(item.name || '')
                  const key = `${catIndex}-${itemIndex}-${name}`
                  const itemLower = name.toLowerCase().trim()
                  const productInfo =
                    pricesForStore &&
                    (pricesForStore[itemLower] ||
                      Object.entries(pricesForStore).find(
                        ([k]) => k.includes(itemLower) || itemLower.includes(k)
                      )?.[1])
                  const pi = productInfo as Record<string, unknown> | undefined
                  const purchaseHint = formatPurchaseHint(pi)
                  const isDone = checked[key]
                  return (
                    <li
                      key={key}
                      className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                        isDone ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${
                          isDone
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                        aria-pressed={isDone}
                      >
                        {isDone && <Check className="w-4 h-4" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium text-slate-900 ${isDone ? 'line-through text-slate-500' : ''}`}
                        >
                          {pi && (pi as { name?: string }).name ? (pi as { name: string }).name : name}
                        </div>
                        {pi && (pi as { name?: string }).name && (
                          <div className="text-xs text-slate-500">{name}</div>
                        )}
                        {purchaseHint ? (
                          <div
                            className={`text-sm font-medium text-emerald-800 mt-0.5 ${isDone ? 'line-through text-slate-500' : ''}`}
                          >
                            Køb: {purchaseHint}
                          </div>
                        ) : null}
                        <div
                          className={`mt-0.5 ${purchaseHint ? 'text-xs text-slate-500' : 'text-sm text-slate-600'} ${isDone ? 'line-through' : ''}`}
                        >
                          {purchaseHint ? 'Til opskrift: ' : null}
                          {formatQty(item.amount)} {String(item.unit || '')}
                        </div>
                        {pi &&
                          ((pi as { isOnSale?: boolean }).isOnSale ||
                            (pi as { totalPrice?: number }).totalPrice) && (
                            <div className="text-sm mt-1">
                              {(pi as { isOnSale?: boolean }).isOnSale ? (
                                <span className="text-emerald-700 font-semibold">
                                  {(pi as { totalPrice?: number; price?: number }).totalPrice != null
                                    ? Number((pi as { totalPrice: number }).totalPrice).toFixed(2).replace('.', ',')
                                    : Number((pi as { price?: number }).price || 0)
                                        .toFixed(2)
                                        .replace('.', ',')}{' '}
                                  kr
                                  <span className="ml-1 text-xs font-normal text-amber-700">tilbud</span>
                                </span>
                              ) : (
                                <span className="text-slate-700">
                                  {Number(
                                    (pi as { totalPrice?: number }).totalPrice ||
                                      (pi as { price?: number }).price ||
                                      0
                                  )
                                    .toFixed(2)
                                    .replace('.', ',')}{' '}
                                  kr
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )

  const mealPlanSection = (
    <div className="bg-white rounded-2xl shadow-xl text-slate-900 overflow-hidden">
      <div className="bg-slate-700 px-4 py-3 flex items-center gap-2 text-white">
        <Calendar className="w-5 h-5" />
        <span className="font-semibold">Ugens madplan</span>
      </div>
      <div className="p-4 max-h-[min(70vh,520px)] overflow-y-auto">
        {!mealDays?.length ? (
          <p className="text-sm text-slate-600">Ingen madplan gemt på dette link.</p>
        ) : (
          <div className="space-y-4">
            {mealDays.map((day) => {
              const withTitles = day.meals?.filter((m) => m.title && String(m.title).trim()) ?? []
              if (withTitles.length === 0) return null
              return (
                <div key={day.dayLabel} className="border-b border-slate-100 pb-3 last:border-0">
                  <h3 className="text-sm font-semibold text-emerald-900">{day.dayLabel}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {withTitles.map((m) => (
                      <li key={`${day.dayLabel}-${m.slot}`} className="flex gap-2 text-sm text-slate-800">
                        <span className="text-slate-400 shrink-0 w-20">{m.slot}</span>
                        <span className="min-w-0 flex-1 leading-snug">{m.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-4">
          Swipe eller brug fanerne ovenfor for at skifte tilbage til indkøbslisten.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-slate-900 text-white pb-12">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center gap-2 text-emerald-200 text-sm mb-2">
          <Store className="w-4 h-4" />
          Indkøb
        </div>
        <h1 className="text-2xl font-bold leading-tight">
          {data.mealSummary?.title || 'Din indkøbsliste'}
        </h1>
        <p className="mt-2 text-emerald-100/90 text-sm flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white font-medium">
            {data.storeName}
          </span>
          <span>
            Kryds af i butikken
            {hasMealPlanPanel ? ' · Swipe for madplan' : ''}
          </span>
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {hasMealPlanPanel ? (
          <>
            <div className="flex rounded-xl bg-white/10 p-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => scrollToPanel(0)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  activePanel === 0 ? 'bg-white text-emerald-900 shadow' : 'text-emerald-100/90'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Indkøb
              </button>
              <button
                type="button"
                onClick={() => scrollToPanel(1)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  activePanel === 1 ? 'bg-white text-emerald-900 shadow' : 'text-emerald-100/90'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Madplan
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 text-emerald-200/80 text-xs">
              <ChevronLeft className="w-4 h-4 opacity-50" />
              <span>Swipe mellem faner</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </div>
            <div
              ref={scrollerRef}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mx-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="w-full min-w-[100%] shrink-0 snap-start px-1 box-border">{listSection}</div>
              <div className="w-full min-w-[100%] shrink-0 snap-start px-1 box-border">{mealPlanSection}</div>
            </div>
          </>
        ) : (
          listSection
        )}

        <p className="text-center text-emerald-200/80 text-xs px-2">
          Functional Foods · Linket åbner din gemte liste til den valgte butik. Vi registrerer at listen blev åbnet, så vi
          kan forbedre produktet.
        </p>
        <div className="text-center">
          <Link href="/madbudget" className="text-white underline text-sm">
            Åbn Madbudget på computer
          </Link>
        </div>
      </div>
    </div>
  )
}
