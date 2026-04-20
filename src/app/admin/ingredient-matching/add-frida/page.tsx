'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type FridaFoodRow = {
  food_id: number
  food_name_da: string
  food_name_en: string | null
}

export default function AddFridaIngredientPage() {
  const [nameDa, setNameDa] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [category, setCategory] = useState('Manuel')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [nextFoodId, setNextFoodId] = useState<number | null>(null)
  const [recent, setRecent] = useState<FridaFoodRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return (
      nameDa.trim().length > 0 &&
      calories.trim().length > 0 &&
      protein.trim().length > 0 &&
      carbs.trim().length > 0 &&
      fat.trim().length > 0
    )
  }, [nameDa, calories, protein, carbs, fat])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/frida-ingredients')
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Kunne ikke hente Frida data')
      }
      setNextFoodId(json.data?.nextFoodId ?? null)
      setRecent(Array.isArray(json.data?.recent) ? json.data.recent : [])
    } catch (error) {
      console.error('loadData /admin/frida-ingredients:', error)
      setStatus(error instanceof Error ? error.message : 'Ukendt fejl')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/frida-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameDa,
          nameEn,
          category,
          calories: Number(calories),
          protein: Number(protein),
          carbs: Number(carbs),
          fat: Number(fat),
          fiber: fiber ? Number(fiber) : 0,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Kunne ikke oprette Frida-ingrediens')
      }
      if (json?.data?.alreadyExisted) {
        setStatus(`Findes allerede: ${json?.data?.food?.food_name_da} (food_id ${json?.data?.food?.food_id})`)
      } else {
        setStatus(
          `Oprettet: ${json?.data?.name_da} (food_id ${json?.data?.food_id}, id ${json?.data?.frida_ingredient_id})`
        )
      }
      await loadData()
    } catch (error) {
      console.error('POST /api/admin/frida-ingredients:', error)
      setStatus(error instanceof Error ? error.message : 'Ukendt fejl')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tilføj til Frida</h1>
            <p className="mt-2 text-gray-600">
              Opret manglende Frida-række med makroer (energi, protein, kulhydrat, fedt).
            </p>
          </div>
          <Link
            href="/admin/ingredient-matching"
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Tilbage til matching
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {isLoading ? (
            <p className="text-gray-600">Henter Frida metadata…</p>
          ) : (
            <p className="text-sm text-gray-600 mb-4">
              Næste foreslåede `food_id`: <span className="font-semibold text-gray-900">{nextFoodId ?? '—'}</span>
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Navn (dansk) *</label>
              <input
                value={nameDa}
                onChange={(e) => setNameDa(e.target.value)}
                placeholder="Kokosmælk, dåse (fuldfed)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Navn (engelsk)</label>
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Coconut milk, canned (full fat)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Manuel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Energi kcal / 100g *</label>
              <input
                type="number"
                step="0.1"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Protein g / 100g *</label>
              <input
                type="number"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kulhydrat g / 100g *</label>
              <input
                type="number"
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fedt g / 100g *</label>
              <input
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fibre g / 100g (valgfri)</label>
              <input
                type="number"
                step="0.1"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || isSaving}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Opretter…' : 'Tilføj til Frida'}
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Opdater liste
            </button>
          </div>

          {status && (
            <p className="mt-4 text-sm text-gray-900 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              {status}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Seneste Frida-rækker</h2>
          <div className="space-y-2">
            {recent.map((row) => (
              <div key={row.food_id} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
                <span className="font-semibold">#{row.food_id}</span> — {row.food_name_da}
                {row.food_name_en ? <span className="text-gray-500"> ({row.food_name_en})</span> : null}
              </div>
            ))}
            {recent.length === 0 && <p className="text-sm text-gray-500">Ingen data fundet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
