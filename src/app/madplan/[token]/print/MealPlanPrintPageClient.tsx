'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { MealPlanPrintView } from '@/components/print/MealPlanPrintView'

export function MealPlanPrintPageClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const autoprint = searchParams.get('autoprint') === '1'
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
        if (!res.ok || !data.plan) {
          setError(data.error || 'Kunne ikke hente madplanen')
          return
        }
        setPlan(data.plan as Record<string, unknown>)
      } catch {
        if (mounted) setError('Noget gik galt')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [token])

  if (loading) {
    return <p className="px-5 py-16 text-center text-gray-600">Henter madplan…</p>
  }

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <h1 className="text-2xl font-bold">Madplan ikke fundet</h1>
        <p className="mt-2 text-gray-600">{error || 'Linket er udløbet eller ugyldigt.'}</p>
        <Link href="/madbudget" className="mt-6 inline-block text-emerald-800 underline">
          Gå til madplan
        </Link>
      </div>
    )
  }

  return <MealPlanPrintView plan={plan} autoprint={autoprint} />
}
