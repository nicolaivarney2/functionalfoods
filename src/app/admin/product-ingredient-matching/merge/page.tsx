'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { authFetch } from '@/lib/auth-fetch'

interface Ingredient {
  id: string
  name: string
  category?: string | null
}

interface MergePreview {
  source: { id: string; name: string }
  target: { id: string; name: string }
  productMatchesToMove: number
  productMatchesAlreadyOnTarget: number
  recipesToUpdate: number
  recipeTitles: string[]
  provisionalRecipesToUpdate: number
}

interface MergeResult {
  productMatchesMoved: number
  productMatchesDroppedAsDuplicates: number
  recipesUpdated: number
  provisionalRecipesUpdated: number
  sourceDeleted: boolean
}

function IngredientPicker({
  label,
  hint,
  ingredients,
  value,
  onChange,
  excludeId,
}: {
  label: string
  hint: string
  ingredients: Ingredient[]
  value: string
  onChange: (id: string) => void
  excludeId?: string
}) {
  const [query, setQuery] = useState('')
  const selected = ingredients.find((ing) => ing.id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ingredients
      .filter((ing) => ing.id !== excludeId)
      .filter((ing) => !q || ing.name.toLowerCase().includes(q))
      .slice(0, 40)
  }, [ingredients, query, excludeId])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-800">{label}</label>
      <p className="text-xs text-gray-500">{hint}</p>
      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
          <div>
            <div className="font-medium text-indigo-950">{selected.name}</div>
            {selected.category ? (
              <div className="text-xs text-indigo-700">{selected.category}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-sm text-indigo-700 hover:text-indigo-900 underline"
          >
            Skift
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg efter ingrediens…"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md bg-white divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Ingen match</div>
            ) : (
              filtered.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => {
                    onChange(ing.id)
                    setQuery('')
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50"
                >
                  <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                  {ing.category ? (
                    <div className="text-xs text-gray-500">{ing.category}</div>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MergeIngredientsPageInner() {
  const searchParams = useSearchParams()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'preview' | 'merge' | null>(null)

  const loadIngredients = useCallback(async () => {
    setLoading(true)
    const all: Ingredient[] = []
    let page = 1
    let more = true
    while (more) {
      const response = await fetch(`/api/admin/ingredients-for-matching?page=${page}&limit=100&sort=name`)
      const data = await response.json()
      if (data.success && data.data.ingredients) {
        all.push(
          ...data.data.ingredients.map((ing: Ingredient) => ({
            id: ing.id,
            name: ing.name,
            category: ing.category,
          }))
        )
        more = data.data.pagination.hasMore
        page += 1
      } else {
        more = false
      }
    }
    all.sort((a, b) => a.name.localeCompare(b.name, 'da'))
    setIngredients(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadIngredients()
  }, [loadIngredients])

  useEffect(() => {
    const fromQuery = searchParams.get('sourceId')?.trim()
    if (fromQuery) setSourceId(fromQuery)
  }, [searchParams])

  const source = ingredients.find((ing) => ing.id === sourceId)
  const target = ingredients.find((ing) => ing.id === targetId)
  const canRun = Boolean(sourceId && targetId && sourceId !== targetId && !busy)

  const runMerge = async (dryRun: boolean) => {
    if (!sourceId || !targetId || sourceId === targetId || busy) return
    setError(null)
    setResult(null)
    if (dryRun) setPreview(null)
    setBusy(dryRun ? 'preview' : 'merge')
    try {
      const response = await authFetch('/api/admin/ingredients/merge', {
        method: 'POST',
        body: JSON.stringify({ sourceId, targetId, dryRun }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Merge fejlede')
      }
      setPreview(data.preview)
      if (!dryRun) {
        setResult(data.result)
        setIngredients((prev) => prev.filter((ing) => ing.id !== sourceId))
        setSourceId('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setBusy(null)
    }
  }

  const confirmMerge = async () => {
    if (!source || !target) return
    const ok = window.confirm(
      `Merge "${source.name}" ind i "${target.name}"?\n\n` +
        `Alle opskrifter med "${source.name}" får navnet "${target.name}".\n` +
        `Produktmatches flyttes, og "${source.name}" slettes bagefter.\n\n` +
        `Det kan ikke fortrydes.`
    )
    if (!ok) return
    await runMerge(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Henter ingredienser…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Merge ingredienser</h1>
            <p className="mt-2 text-gray-600">
              Saml dubletter som &quot;gulerod&quot; og &quot;gulerødder&quot;, så indkøbslisten kun viser én linje.
              Produkter flyttes over, og alle opskrifter opdateres til mål-navnet.
            </p>
          </div>
          <Link
            href="/admin/product-ingredient-matching"
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0"
          >
            Tilbage til matching
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <IngredientPicker
              label="Fra (slettes)"
              hint="Den stavemåde der skal forsvinde, f.eks. Gulerod"
              ingredients={ingredients}
              value={sourceId}
              onChange={(id) => {
                setSourceId(id)
                setPreview(null)
                setResult(null)
              }}
              excludeId={targetId}
            />
            <IngredientPicker
              label="Til (beholdes)"
              hint="Det navn opskrifterne skal bruge, f.eks. Gulerødder"
              ingredients={ingredients}
              value={targetId}
              onChange={(id) => {
                setTargetId(id)
                setPreview(null)
                setResult(null)
              }}
              excludeId={sourceId}
            />
          </div>

          {source && target ? (
            <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-800">
              <strong>{source.name}</strong> bliver til <strong>{target.name}</strong>. Kilde-ingrediensen slettes
              bagefter.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canRun}
              onClick={() => void runMerge(true)}
              className="px-4 py-2 text-sm font-medium text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 disabled:opacity-50"
            >
              {busy === 'preview' ? 'Tjekker…' : 'Forhåndsvisning'}
            </button>
            <button
              type="button"
              disabled={!canRun}
              onClick={() => void confirmMerge()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy === 'merge' ? 'Merger…' : 'Merge nu'}
            </button>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {preview ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 space-y-2">
              <div className="font-semibold">
                {preview.source.name} → {preview.target.name}
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  {preview.productMatchesToMove} produktmatch flyttes
                  {preview.productMatchesAlreadyOnTarget > 0
                    ? ` (${preview.productMatchesAlreadyOnTarget} fandtes allerede på målet)`
                    : ''}
                </li>
                <li>{preview.recipesToUpdate} opskrifter opdateres</li>
                {preview.provisionalRecipesToUpdate > 0 ? (
                  <li>{preview.provisionalRecipesToUpdate} foreløbige opskrifter opdateres</li>
                ) : null}
              </ul>
              {preview.recipeTitles.length > 0 ? (
                <div>
                  <div className="text-xs font-medium text-gray-600 mt-2 mb-1">Berørte opskrifter</div>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    {preview.recipeTitles.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                    {preview.recipesToUpdate > preview.recipeTitles.length ? (
                      <li>…og {preview.recipesToUpdate - preview.recipeTitles.length} mere</li>
                    ) : null}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Ingen opskrifter bruger kildenavnet lige nu.</p>
              )}
            </div>
          ) : null}

          {result ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 space-y-1">
              <div className="font-semibold">Merge gennemført</div>
              <p>
                Flyttede {result.productMatchesMoved} produktmatches
                {result.productMatchesDroppedAsDuplicates > 0
                  ? ` og sprang ${result.productMatchesDroppedAsDuplicates} dubletter over`
                  : ''}
                . Opdaterede {result.recipesUpdated} opskrifter
                {result.provisionalRecipesUpdated > 0
                  ? ` og ${result.provisionalRecipesUpdated} foreløbige`
                  : ''}
                . Kilde-ingrediensen er slettet.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function MergeIngredientsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-600">Indlæser…</p>
        </div>
      }
    >
      <MergeIngredientsPageInner />
    </Suspense>
  )
}
