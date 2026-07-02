'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, Trash2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'

type GroupAlert = {
  id: string
  product_name: string
  storeName: string
  image_url: string | null
  productOfferId: string | number | null
  currentPrice: number | null
  normalPrice: number | null
  isOnSale: boolean
  triggered: boolean
}

type GroupDetail = {
  id: string
  label: string
  search_query: string
  threshold_type: 'any_sale' | 'min_discount'
  min_discount_pct: number | null
  alertCount: number
  triggeredCount: number
}

export default function PrisalarmGruppePage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const groupId = String(params.id || '')

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [alerts, setAlerts] = useState<GroupAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !groupId) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/price-alerts/groups/${encodeURIComponent(groupId)}`)
        if (!res.ok) {
          setGroup(null)
          return
        }
        const data = await res.json()
        setGroup(data.group)
        setAlerts(data.alerts ?? [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user, groupId])

  const deleteGroup = async () => {
    const res = await authFetch(`/api/price-alerts/groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
    })
    if (res.ok) router.push('/prisalarmer')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 text-center px-4">
        <p className="text-gray-600">Log ind for at se prisalarm-gruppen.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container max-w-3xl mx-auto px-4">
        <Link href="/prisalarmer" className="inline-flex items-center text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Tilbage til prisalarmer
        </Link>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
          </div>
        ) : !group ? (
          <p className="text-gray-600">Gruppen blev ikke fundet.</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Bell size={28} className="text-amber-500" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{group.label}</h1>
                  <p className="text-gray-600 text-sm">
                    {group.alertCount} varer · {group.triggeredCount} på tilbud nu
                  </p>
                </div>
              </div>
              <button
                onClick={() => void deleteGroup()}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
                Slet hele gruppen
              </button>
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl border p-4 flex gap-4 ${
                    alert.triggered ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {alert.image_url ? (
                      <img src={alert.image_url} alt="" className="w-full h-full object-contain" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium text-gray-900 truncate">{alert.product_name}</h2>
                    <p className="text-sm text-gray-500">{alert.storeName}</p>
                    <div className="mt-1 text-sm">
                      {alert.currentPrice != null && (
                        <span className="font-medium">{alert.currentPrice.toFixed(2)} kr</span>
                      )}
                      {alert.triggered && (
                        <span className="ml-2 text-green-700 text-xs font-medium">På tilbud</span>
                      )}
                      {alert.productOfferId && (
                        <Link
                          href={`/dagligvarer/produkt/${alert.productOfferId}`}
                          className="ml-3 text-green-600 hover:text-green-700"
                        >
                          Se produkt →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
