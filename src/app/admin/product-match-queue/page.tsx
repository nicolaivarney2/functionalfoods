'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'

interface Ingredient {
  id: string
  name: string
}

interface MatchQueueItem {
  id: string
  product_id: string
  store_product_id: string
  store_id: string
  store_label: string
  product_name_snapshot: string | null
  name_generic: string | null
  brand: string | null
  category: string | null
  queued_at: string
  current_price: number | null
  normal_price: number | null
  name_store: string | null
}

export default function ProductMatchQueuePage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [ingredientsLoading, setIngredientsLoading] = useState(true)
  const [matchQueueItems, setMatchQueueItems] = useState<MatchQueueItem[]>([])
  const [matchQueueLoading, setMatchQueueLoading] = useState(true)
  const [matchQueueTableMissing, setMatchQueueTableMissing] = useState(false)
  const [queueIngredientChoice, setQueueIngredientChoice] = useState<Record<string, string>>({})
  const [queueActionId, setQueueActionId] = useState<string | null>(null)

  const loadIngredients = useCallback(async () => {
    setIngredientsLoading(true)
    const all: Ingredient[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      try {
        const response = await fetch(`/api/admin/ingredients-for-matching?page=${page}&limit=100&sort=name`)
        const data = await response.json()
        if (data.success && data.data.ingredients) {
          all.push(
            ...data.data.ingredients.map((ing: { id: string; name: string }) => ({
              id: ing.id,
              name: ing.name,
            })),
          )
          hasMore = data.data.pagination.hasMore
          page++
        } else {
          hasMore = false
        }
      } catch {
        hasMore = false
      }
    }

    setIngredients(all)
    setIngredientsLoading(false)
  }, [])

  const loadMatchQueue = useCallback(async () => {
    setMatchQueueLoading(true)
    try {
      const res = await fetch('/api/admin/product-match-queue')
      const data = await res.json()
      if (data.success && data.data) {
        setMatchQueueItems(data.data.items || [])
        setMatchQueueTableMissing(!!data.data.queueTableMissing)
      }
    } catch (e) {
      console.error('loadMatchQueue:', e)
    } finally {
      setMatchQueueLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadIngredients()
    void loadMatchQueue()
  }, [loadIngredients, loadMatchQueue])

  const ingredientOptions = useMemo(
    () => ingredients.slice().sort((a, b) => a.name.localeCompare(b.name, 'da')),
    [ingredients],
  )

  const handleQueueMatch = async (queueId: string) => {
    const ingredientId = queueIngredientChoice[queueId]?.trim()
    if (!ingredientId) {
      alert('Vælg en ingrediens først')
      return
    }
    setQueueActionId(queueId)
    try {
      const res = await fetch('/api/admin/product-match-queue/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId, ingredient_id: ingredientId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(data.message || 'Match fejlede')
        return
      }
      await loadMatchQueue()
      setQueueIngredientChoice((prev) => {
        const next = { ...prev }
        delete next[queueId]
        return next
      })
    } finally {
      setQueueActionId(null)
    }
  }

  const handleQueueDismiss = async (queueId: string) => {
    setQueueActionId(queueId)
    try {
      const res = await fetch('/api/admin/product-match-queue/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(data.message || 'Kunne ikke afvise')
        return
      }
      await loadMatchQueue()
      setQueueIngredientChoice((prev) => {
        const next = { ...prev }
        delete next[queueId]
        return next
      })
    } finally {
      setQueueActionId(null)
    }
  }

  const pageLoading = ingredientsLoading && matchQueueLoading && matchQueueItems.length === 0

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Henter Goma-kø…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kø: nye varer fra Goma</h1>
              <p className="mt-2 text-gray-600 max-w-2xl">
                Varer der landede i kataloget efter nat-sync. Vælg ingrediens og bekræft — eller
                afvis hvis varen ikke skal kobles til opskrifter.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href="/admin/product-ingredient-matching"
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Produkt–ingrediens matching
              </Link>
              <button
                type="button"
                onClick={() => void loadMatchQueue()}
                disabled={matchQueueLoading}
                className="px-4 py-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-60"
              >
                {matchQueueLoading ? 'Opdaterer…' : 'Opdater kø'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-indigo-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Afventende varer</h2>
              <p className="text-sm text-gray-600 mt-1">
                Omvendt matching: vare → ingrediens (modsat hovedsiden hvor du starter fra
                ingrediensen).
              </p>
            </div>
            {matchQueueItems.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 shrink-0">
                {matchQueueItems.length} i køen
              </span>
            )}
          </div>

          {matchQueueTableMissing && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Tabellen <code className="text-xs">product_ingredient_match_queue</code> findes ikke
              endnu. Kør migrationen i Supabase:{' '}
              <code className="text-xs break-all">
                supabase/migrations/20260417120000_product_ingredient_match_queue.sql
              </code>
            </p>
          )}

          {!matchQueueTableMissing && matchQueueLoading && matchQueueItems.length === 0 && (
            <p className="text-sm text-gray-500">Henter kø…</p>
          )}

          {!matchQueueTableMissing && !matchQueueLoading && matchQueueItems.length === 0 && (
            <p className="text-sm text-gray-600">Ingen nye varer i køen lige nu.</p>
          )}

          {!matchQueueTableMissing && matchQueueItems.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Vare</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Butik</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Pris</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Kø siden</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 min-w-[14rem]">
                      Ingrediens
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {matchQueueItems.map((q) => {
                    const label =
                      q.name_store || q.name_generic || q.product_name_snapshot || 'Vare'
                    const busy = queueActionId === q.id
                    return (
                      <tr key={q.id}>
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-gray-900">{label}</div>
                          {q.brand && <div className="text-xs text-gray-500">{q.brand}</div>}
                          {q.category && (
                            <div className="text-xs text-gray-500">{q.category}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-gray-700">{q.store_label}</td>
                        <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                          {q.current_price != null
                            ? `${Number(q.current_price).toFixed(2)} kr`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 align-top text-gray-600 whitespace-nowrap">
                          {new Date(q.queued_at).toLocaleString('da-DK', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            value={queueIngredientChoice[q.id] || ''}
                            onChange={(e) =>
                              setQueueIngredientChoice((prev) => ({
                                ...prev,
                                [q.id]: e.target.value,
                              }))
                            }
                            disabled={ingredientsLoading}
                            className="w-full max-w-xs px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Vælg ingrediens…</option>
                            {ingredientOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleQueueMatch(q.id)}
                            className="mr-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {busy ? '…' : 'Match'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleQueueDismiss(q.id)}
                            className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                          >
                            Afvis
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
