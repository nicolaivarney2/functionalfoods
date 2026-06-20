'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, Trash2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'

interface PriceAlert {
  id: string
  product_name: string
  image_url: string | null
  product_offer_id: string | null
  threshold_type: 'any_sale' | 'min_discount'
  min_discount_pct: number | null
  is_active: boolean
  currentPrice: number | null
  normalPrice: number | null
  isOnSale: boolean
  discountPct: number | null
  triggered: boolean
}

export default function PrisalarmerPage() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/price-alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts ?? [])
      }
    } catch (err) {
      console.error('Failed to load price alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadAlerts()
  }, [user])

  const removeAlert = async (id: string) => {
    try {
      const res = await authFetch(`/api/price-alerts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (err) {
      console.error('Failed to remove alert:', err)
    }
  }

  const thresholdLabel = (alert: PriceAlert) => {
    if (alert.threshold_type === 'any_sale') return 'Når varen er på tilbud'
    return `Min. ${alert.min_discount_pct ?? 20}% rabat`
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container max-w-2xl mx-auto px-4 text-center">
          <Bell size={48} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Log ind for at se dine prisalarmer</h1>
          <p className="text-gray-600">Opret alarmer fra dagligvarer-siden når du er logget ind.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container max-w-3xl mx-auto px-4">
        <Link href="/dagligvarer" className="inline-flex items-center text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Tilbage til dagligvarer
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Bell size={32} className="text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prisalarmer</h1>
            <p className="text-gray-600">
              {alerts.length === 0
                ? 'Du har ingen aktive alarmer'
                : `${alerts.length} alarm${alerts.length === 1 ? '' : 'er'}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Bell size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">
              Opret en prisalarm fra et produktkort eller produktsiden under dagligvarer.
            </p>
            <Link
              href="/dagligvarer"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Gå til dagligvarer
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border p-4 flex gap-4 ${
                  alert.triggered ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                }`}
              >
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {alert.image_url ? (
                    <img src={alert.image_url} alt="" className="w-full h-full object-contain" />
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-gray-900 truncate">{alert.product_name}</h2>
                      <p className="text-sm text-gray-500">{thresholdLabel(alert)}</p>
                    </div>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"
                      aria-label="Fjern alarm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    {alert.currentPrice != null && (
                      <span className="font-medium text-gray-900">
                        {alert.currentPrice.toFixed(2)} kr
                        {alert.isOnSale && alert.normalPrice != null && alert.normalPrice > alert.currentPrice && (
                          <span className="ml-2 text-gray-500 line-through">
                            {alert.normalPrice.toFixed(2)} kr
                          </span>
                        )}
                      </span>
                    )}
                    {alert.triggered ? (
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        På tilbud nu
                      </span>
                    ) : (
                      <span className="text-gray-500">Ikke udløst endnu</span>
                    )}
                    {alert.product_offer_id && (
                      <Link
                        href={`/dagligvarer/produkt/${alert.product_offer_id}`}
                        className="text-green-600 hover:text-green-700"
                      >
                        Se produkt →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
