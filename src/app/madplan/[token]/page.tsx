'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Share2, Utensils, ShoppingCart, ChevronRight, Users, Store, Calendar } from 'lucide-react'

function formatFetchedDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

const STORE_NAMES: Record<number, string> = {
  1: 'REMA 1000',
  2: 'Netto',
  3: 'Føtex',
  4: 'Bilka',
  5: 'Nemlig.com',
  6: 'MENY',
  7: 'Spar',
  8: 'Løvbjerg'
}

const STORE_COLORS: Record<number, string> = {
  1: 'bg-blue-600',
  2: 'bg-yellow-500',
  3: 'bg-blue-500',
  4: 'bg-blue-700',
  5: 'bg-orange-500',
  6: 'bg-red-600',
  7: 'bg-red-500',
  8: 'bg-green-600'
}

const STORE_ID_TO_KEY: Record<number, string> = {
  1: 'rema-1000',
  2: 'netto',
  3: 'føtex',
  4: 'bilka',
  5: 'nemlig-com',
  6: 'meny',
  7: 'spar',
  8: 'løvbjerg'
}

const DIETARY_LABELS: Record<string, string> = {
  keto: 'Keto',
  sense: 'Sense',
  'glp-1': 'GLP-1',
  familiemad: 'Familiemad',
  'lchf-paleo': 'LCHF/Paleo'
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mandag',
  tuesday: 'Tirsdag',
  wednesday: 'Onsdag',
  thursday: 'Torsdag',
  friday: 'Fredag',
  saturday: 'Lørdag',
  sunday: 'Søndag'
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Morgenmad',
  lunch: 'Frokost',
  dinner: 'Aftensmad'
}

export default function SharedMealPlanPage() {
  const params = useParams()
  const token = params?.token as string
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStoreTab, setSelectedStoreTab] = useState<string>('all')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Ugyldigt link')
      return
    }
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`/api/madbudget/share/${token}`)
        const data = await res.json()
        if (!mounted) return
        if (!res.ok) {
          setError(data.error || 'Kunne ikke hente madplan')
          return
        }
        setPlan(data.plan)
      } catch (e) {
        if (mounted) setError('Noget gik galt')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [token])

  // Statisk priser fra deling – ingen API-kald ved besøg
  const rawPrices = (plan?.shopping_list_prices as Record<string, any>) || {}
  const pricesFetchedAt = rawPrices._fetchedAt as string | undefined
  const storePrices = Object.fromEntries(
    Object.entries(rawPrices).filter(([k]) => !k.startsWith('_'))
  ) as Record<string, Record<string, any>>

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Henter madplan...</p>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Madplan ikke fundet</h1>
          <p className="text-gray-600 mb-6">{error || 'Linket er udløbet eller ugyldigt.'}</p>
          <Link href="/madbudget" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium">
            Lav din egen madplan <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const family = plan.family_profile_snapshot || {}
  const adults = family.adults ?? 0
  const children = family.children ?? 0
  const storeIds = family.selectedStores || []
  const storeNames = storeIds.map((id: number) => STORE_NAMES[id] || `Butik ${id}`).filter(Boolean)
  const primaryDiet = family.adultsProfiles?.[0]?.dietaryApproach || 'sense'
  const dietLabel = DIETARY_LABELS[primaryDiet] || primaryDiet
  const sharedByName = plan.shared_by_name || null
  const planTitle = sharedByName ? `${sharedByName}s madplan` : 'Delt madplan'

  const rawMealPlan = plan.meal_plan_data || {}
  const mealPlan = (
    rawMealPlan &&
    typeof rawMealPlan === 'object' &&
    'grid' in rawMealPlan &&
    rawMealPlan.grid &&
    typeof rawMealPlan.grid === 'object' &&
    'monday' in (rawMealPlan.grid as object)
      ? rawMealPlan.grid
      : rawMealPlan
  ) as Record<string, Record<string, { title?: string; slug?: string; id?: string; image?: string; imageUrl?: string }>>
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const mealKeys = ['breakfast', 'lunch', 'dinner']
  const shoppingList = plan.shopping_list || {}
  const categories = shoppingList.categories || []
  const mainCategories = categories.filter((c: any) => c.name !== 'Varer du måske allerede har')
  const basisCategory = categories.find((c: any) => c.name === 'Varer du måske allerede har')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Marketing */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium mb-2">
            <Utensils size={16} />
            <span>Lavet med Functionalfoods</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {planTitle}
          </h1>
          <p className="text-gray-600 mb-6">
            Planlæg din uge med tilbud fra din butik, tilpasset din kostretning og antal personer. 
            Spar tid og penge – prøv at lave din egen madplan.
          </p>

          {/* Info-boks om madplanen */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Om denne madplan</h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              {(adults > 0 || children > 0) && (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-500" />
                  <span>
                    {adults > 0 && `${adults} voksne`}
                    {adults > 0 && children > 0 && ' og '}
                    {children > 0 && `${children} børn`}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Utensils size={16} className="text-gray-500" />
                <span>{dietLabel}</span>
              </div>
              {storeNames.length > 0 && (
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-gray-500" />
                  <span>Tilbud fra {storeNames.join(', ')}</span>
                </div>
              )}
              {pricesFetchedAt && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  <span>Tilbud hentet {formatFetchedDate(pricesFetchedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meal plan med billeder og links */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Utensils size={20} />
          Madplanen
        </h2>
        <div className="space-y-4">
          {days.map((dayKey) => {
            const day = mealPlan[dayKey]
            if (!day) return null
            return (
              <div key={dayKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <h3 className="font-medium text-gray-900 px-4 pt-4 pb-2">{DAY_LABELS[dayKey] || dayKey}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
                  {mealKeys.map((mealKey) => {
                    const m = day[mealKey]
                    if (!m?.title) return null
                    const slug = m.slug || m.id
                    const href = slug ? `/opskrift/${slug}` : null
                    const img = m.image || m.imageUrl
                    return (
                      <div key={mealKey} className="border-t border-gray-100 first:border-t-0 sm:first:border-t sm:first:border-l-0">
                        {href ? (
                          <Link href={href} className="block group">
                            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                              {img ? (
                                <img src={img} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Utensils size={32} />
                                </div>
                              )}
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-white/90 text-gray-700">
                                {MEAL_LABELS[mealKey]}
                              </span>
                            </div>
                            <div className="p-3">
                              <span className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">{m.title}</span>
                            </div>
                          </Link>
                        ) : (
                          <div>
                            <div className="aspect-[4/3] bg-gray-100 relative">
                              {img ? (
                                <img src={img} alt={m.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Utensils size={32} />
                                </div>
                              )}
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-white/90 text-gray-700">
                                {MEAL_LABELS[mealKey]}
                              </span>
                            </div>
                            <div className="p-3">
                              <span className="font-medium text-gray-900">{m.title}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Indkøbsliste – madbudget-lignende med tilbud og priser */}
        {categories.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mt-10 mb-4 flex items-center gap-2">
              <ShoppingCart size={20} />
              Indkøbsliste
            </h2>
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Store tabs – kun når vi har cached priser fra deling */}
              {storeIds.length > 0 && Object.keys(storePrices).length > 0 && (
                <div className="border-b border-gray-200 mb-4">
                  <div className="flex space-x-1 overflow-x-auto">
                    <button
                      onClick={() => setSelectedStoreTab('all')}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        selectedStoreTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Alle butikker
                    </button>
                    {storeIds.map((storeId: number) => {
                      const storeKey = STORE_ID_TO_KEY[storeId]
                      if (!storeKey) return null
                      let storeTotal = 0
                      if (storePrices[storeKey]) {
                        Object.values(storePrices[storeKey]).forEach((p: any) => {
                          storeTotal += p?.totalPrice ?? p?.price ?? 0
                        })
                      }
                      return (
                        <button
                          key={storeId}
                          onClick={() => setSelectedStoreTab(storeKey)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            selectedStoreTab === storeKey ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${STORE_COLORS[storeId] || 'bg-gray-400'}`} />
                          {STORE_NAMES[storeId] || `Butik ${storeId}`}
                          {storeTotal > 0 && (
                            <span className="text-xs font-normal">
                              ({storeTotal.toFixed(0).replace('.', ',')} kr)
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                  {mainCategories.map((cat: any, i: number) => (
                    <div key={i} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h4 className="font-semibold text-gray-900 mb-3">{cat.name}</h4>
                      <ul className="space-y-2">
                        {cat.items?.map((item: any, j: number) => {
                          const itemNameLower = item.name?.toLowerCase().trim() || ''
                          let productInfo: any = null
                          if (selectedStoreTab !== 'all' && storePrices[selectedStoreTab]) {
                            productInfo = storePrices[selectedStoreTab][itemNameLower]
                            if (!productInfo) {
                              const found = Object.keys(storePrices[selectedStoreTab]).find(k =>
                                k.includes(itemNameLower) || itemNameLower.includes(k)
                              )
                              if (found) productInfo = storePrices[selectedStoreTab][found]
                            }
                          }
                          const formatQty = (n: number) => {
                            const r = Number.isFinite(n) ? parseFloat(Number(n).toFixed(2)) : n
                            return (r % 1 === 0 ? String(Math.round(r)) : r.toFixed(1)).replace('.', ',')
                          }
                          return (
                            <li key={j} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                {productInfo ? (
                                  <div>
                                    <div className="text-gray-700 font-medium">{productInfo.name}</div>
                                    <div className="text-xs text-gray-500">{item.name}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-700">{item.name}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-gray-900 font-medium">
                                  {formatQty(item.amount)} {item.unit}
                                </div>
                                {productInfo && (productInfo.totalPrice || productInfo.price) && (
                                  <div className="text-sm">
                                    {productInfo.isOnSale ? (
                                      <>
                                        <span className="text-green-600 font-semibold">
                                          {(productInfo.totalPrice || productInfo.price).toFixed(2).replace('.', ',')} kr
                                        </span>
                                        {productInfo.totalNormalPrice && (
                                          <span className="text-gray-400 line-through ml-1 text-xs">
                                            {productInfo.totalNormalPrice.toFixed(2).replace('.', ',')} kr
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-gray-700">
                                        {(productInfo.totalPrice || productInfo.price).toFixed(2).replace('.', ',')} kr
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
                  ))}

                  {basisCategory && basisCategory.items?.length > 0 && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">Varer du måske allerede har</h4>
                      <ul className="space-y-1 text-sm text-amber-800">
                        {basisCategory.items.map((item: any, j: number) => {
                          const n = Number(item.amount)
                          const rounded = Number.isFinite(n) ? parseFloat(n.toFixed(2)) : item.amount
                          const fmt = typeof rounded === 'number' ? (rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1)).replace('.', ',') : rounded
                          return (
                            <li key={j} className="flex justify-between">
                              <span>{item.name}</span>
                              <span>{fmt} {item.unit}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-12 p-6 bg-green-50 rounded-xl border border-green-200 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Lav din egen madplan</h3>
          <p className="text-gray-600 mb-4">
            Få tilbud fra din butik, tilpasset din familie og kostretning. Gratis at bruge.
          </p>
          <Link
            href="/madbudget"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Share2 size={18} />
            Prøv Functionalfoods
          </Link>
        </div>
      </div>
    </div>
  )
}
