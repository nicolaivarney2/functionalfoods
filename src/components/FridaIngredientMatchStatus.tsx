'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, FlaskConical } from 'lucide-react'

interface Row {
  ingredientId: string | null
  name: string
  amount: number | null
  unit: string
  hasIngredientRowId: boolean
  hasFridaMatch: boolean
  fridaIngredientId: string | null
  fridaNameDa: string | null
  /** Bidrag fra denne linjes mængde (Frida pr. 100 g × gram), samme logik som genberegning */
  contribution?: {
    grams: number
    kcal: number
    protein: number
    carbs: number
    fat: number
  } | null
}

interface Props {
  recipeSlug: string
}

export default function FridaIngredientMatchStatus({ recipeSlug }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [matchedCount, setMatchedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/recipes/${encodeURIComponent(recipeSlug)}/frida-match-status`, {
          cache: 'no-store',
        })
        const json = await res.json()
        if (!json.success) {
          if (!cancelled) setError(json.message || 'Kunne ikke hente Frida-status')
          return
        }
        const d = json.data
        if (!cancelled) {
          setRows(d.rows || [])
          setMatchedCount(d.matchedCount ?? 0)
          setTotalCount(d.totalCount ?? 0)
        }
      } catch (e) {
        if (!cancelled) setError('Netværksfejl')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [recipeSlug])

  if (loading) {
    return (
      <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
        <div className="flex items-center gap-2 text-sm text-emerald-900">
          <FlaskConical size={16} className="text-emerald-600" />
          <span className="font-medium">Frida / næring</span>
        </div>
        <p className="text-sm text-emerald-800 mt-2">Henter…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 border border-red-200 text-sm text-red-800">{error}</div>
    )
  }

  const pct = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0

  return (
    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-emerald-600" />
          <h3 className="text-sm font-medium text-emerald-900">Frida / næring (ingredient_matches)</h3>
        </div>
        <span className="text-xs text-emerald-800">
          {matchedCount}/{totalCount} matchet ({pct}%)
        </span>
      </div>
      <p className="text-xs text-emerald-800 mb-3">
        Dette er <strong>ikke</strong> det samme som dagligvarer nedenfor. Her tæller gemte rækker i{' '}
        <code className="bg-emerald-100 px-1 rounded">ingredient_matches</code> (Frida-kobling pr. ingrediens-id). Du kan
        matche manuelt under admin → Ingredient matching — eller køre <strong>ernærings-genberegning</strong> herover: ved
        succes gemmes auto-matchet Frida-id, så denne status kan gå fra 0 % uden manuel gennemgang.
      </p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-emerald-700 hover:text-emerald-900 underline mb-2"
      >
        {expanded ? 'Skjul liste' : 'Vis liste'}
      </button>
      {expanded && (
        <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {rows.map((r, idx) => (
            <li
              key={r.ingredientId || `row-${idx}`}
              className="bg-white rounded border border-emerald-100 px-3 py-2 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {r.hasFridaMatch ? (
                    <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 break-words">
                      {r.amount != null && r.unit ? `${r.amount} ${r.unit} ` : ''}
                      {r.name}
                    </div>
                    {!r.hasIngredientRowId && (
                      <p className="text-xs text-amber-800 mt-1">
                        Mangler ingrediens-id på rækken — kan ikke gemmes i ingredient_matches før den har id.
                      </p>
                    )}
                    {r.hasFridaMatch && r.fridaNameDa && (
                      <p className="text-xs text-gray-600 mt-1">
                        → Frida: <span className="font-medium">{r.fridaNameDa}</span>
                      </p>
                    )}
                    {r.contribution && (
                      <div className="mt-2 text-xs text-gray-700 bg-emerald-50/80 rounded border border-emerald-100 px-2 py-1.5 font-mono tabular-nums">
                        <span className="text-emerald-800 font-sans font-medium mr-2">Estimat for linjen:</span>
                        ~{r.contribution.kcal} kcal · kulhydrat {r.contribution.carbs} g · protein{' '}
                        {r.contribution.protein} g · fedt {r.contribution.fat} g
                        <span className="text-gray-500 font-sans ml-2">
                          (≈ {r.contribution.grams} g råvægt · Frida pr. 100 g)
                        </span>
                      </div>
                    )}
                    {r.hasFridaMatch && !r.fridaNameDa && r.fridaIngredientId && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">→ {r.fridaIngredientId}</p>
                    )}
                    {!r.hasFridaMatch && r.hasIngredientRowId && (
                      <p className="text-xs text-amber-700 mt-1">Ingen Frida-match gemt.</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
