'use client'

import { useEffect, useState } from 'react'

interface MatchRow {
  id: number
  recipe_ingredient_id: string
  frida_ingredient_id: string
  confidence: number
  is_manual: boolean
  match_type?: string
  created_at: string
  updated_at: string
}

export default function RecentIngredientMatchesPage() {
  const [rows, setRows] = useState<MatchRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/ingredient-matches')
      const data = await res.json()
      setRows(Array.isArray(data) ? data.slice(0, 50) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const undo = async (row: MatchRow) => {
    const ok = confirm(`Fortryd match?\n\nRecipe ingredient: ${row.recipe_ingredient_id}\nFrida ingredient: ${row.frida_ingredient_id}`)
    if (!ok) return
    try {
      const res = await fetch('/api/ingredient-matches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      await load()
    } catch (e) {
      alert(`❌ Kunne ikke fortryde: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seneste ingrediens matches</h1>
            <p className="text-gray-600">Se de nyeste matches og fortryd ved fejl</p>
          </div>
          <button onClick={load} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Opdater</button>
        </div>

        {isLoading ? (
          <div className="text-gray-600">Indlæser...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="bg-white border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Recipe Ingredient</th>
                  <th className="p-2 text-left">Frida Ingredient</th>
                  <th className="p-2 text-left">Confidence</th>
                  <th className="p-2 text-left">Created</th>
                  <th className="p-2 text-left">Handling</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.id}</td>
                    <td className="p-2 font-mono">{r.recipe_ingredient_id}</td>
                    <td className="p-2 font-mono">{r.frida_ingredient_id}</td>
                    <td className="p-2">{r.confidence}%</td>
                    <td className="p-2">{new Date(r.created_at).toLocaleString('da-DK')}</td>
                    <td className="p-2">
                      <button onClick={() => undo(r)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Undo</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={6}>Ingen matches endnu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


