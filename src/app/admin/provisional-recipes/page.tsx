'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { createSupabaseClient } from '@/lib/supabase'
import type { ProvisionalRecipeRow, ProvisionalIngredient } from '@/lib/provisional-recipes'
import { Check, X, Loader2, RefreshCw, Image as ImageIcon, Trash2, Plus, Sparkles, Copy } from 'lucide-react'

const STATUS_TABS = [
  { key: 'pending', label: 'Afventer' },
  { key: 'approved', label: 'Godkendt' },
  { key: 'rejected', label: 'Afvist' },
  { key: 'all', label: 'Alle' },
] as const

const MAIN_CATEGORIES = ['Hovedretter', 'Sund mad', 'Proteinrig kost', 'Morgenmad', 'Frokost', 'Snacks', 'Desserter']

type EditState = {
  title: string
  description: string
  mainCategory: string
  imageUrl: string
  ingredients: ProvisionalIngredient[]
  instructionsText: string
  credit: string
  midjourneyPrompt: string
}

export default function AdminProvisionalRecipesPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]['key']>('pending')
  const [items, setItems] = useState<ProvisionalRecipeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, EditState>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [aiBusyId, setAiBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const initEdit = (r: ProvisionalRecipeRow): EditState => ({
    title: r.title,
    description: r.description || '',
    mainCategory: 'Hovedretter',
    imageUrl: r.image_url || '',
    ingredients: (r.ingredients || []).map((i) => ({ ...i })),
    instructionsText: (r.instructions || []).map((s) => s.instruction).join('\n'),
    credit: r.submittedBy ? `Indsendt af ${r.submittedBy}` : '',
    midjourneyPrompt: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/provisional-recipes?status=${status}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kunne ikke hente')
      const rows: ProvisionalRecipeRow[] = json.data || []
      setItems(rows)
      setEdits((prev) => {
        const next = { ...prev }
        for (const r of rows) if (!next[r.id]) next[r.id] = initEdit(r)
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setLoading(false)
    }
  }, [status, authHeaders])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  const patchEdit = (id: string, patch: Partial<EditState>) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], ...patch } }))

  const handleUpload = async (id: string, file: File) => {
    setUploadingId(id)
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('recipeId', `temp-prov-${id}`)
      const res = await fetch('/api/admin/upload-recipe-image', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok || !json.imageUrl) throw new Error(json.error || 'Upload fejlede')
      patchEdit(id, { imageUrl: json.imageUrl })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload fejlede')
    } finally {
      setUploadingId(null)
    }
  }

  const runAiCleanup = async (r: ProvisionalRecipeRow) => {
    const e = edits[r.id]
    if (!e) return
    setAiBusyId(r.id)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      const instructions = e.instructionsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((instruction, i) => ({ stepNumber: i + 1, instruction }))
      const res = await fetch('/api/admin/provisional-recipes/ai-cleanup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipe: {
            title: e.title,
            description: e.description,
            servings: r.servings,
            dietaryCategories: r.dietary_categories,
            ingredients: e.ingredients,
            instructions,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI-klargøring fejlede')
      patchEdit(r.id, {
        ingredients: Array.isArray(json.ingredients) && json.ingredients.length
          ? json.ingredients
          : e.ingredients,
        instructionsText: Array.isArray(json.instructions) && json.instructions.length
          ? json.instructions.map((s: { instruction: string }) => s.instruction).join('\n')
          : e.instructionsText,
        midjourneyPrompt: json.midjourneyPrompt || e.midjourneyPrompt,
      })
      if (json.aiError) console.warn('AI-cleanup:', json.aiError)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'AI-klargøring fejlede')
    } finally {
      setAiBusyId(null)
    }
  }

  const copyPrompt = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
    } catch {
      // ignorér clipboard-fejl
    }
  }

  const approve = async (r: ProvisionalRecipeRow) => {
    const e = edits[r.id]
    if (!e) return
    if (!e.ingredients.length) {
      alert('Tilføj mindst én ingrediens før godkendelse.')
      return
    }
    setBusyId(r.id)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      const instructions = e.instructionsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((instruction, i) => ({ stepNumber: i + 1, instruction }))
      const res = await fetch('/api/admin/provisional-recipes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: r.id,
          action: 'approve',
          imageUrl: e.imageUrl || undefined,
          mainCategory: e.mainCategory,
          credit: e.credit || undefined,
          recipe: {
            title: e.title,
            description: e.description,
            ingredients: e.ingredients,
            instructions,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Godkendelse fejlede')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fejl')
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (r: ProvisionalRecipeRow) => {
    const reason = window.prompt('Begrundelse for afvisning (vises til brugeren):', '')
    if (reason === null) return
    setBusyId(r.id)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      const res = await fetch('/api/admin/provisional-recipes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: r.id, action: 'reject', reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Afvisning fejlede')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fejl')
    } finally {
      setBusyId(null)
    }
  }

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Henter…
        </div>
      )
    }
    if (!items.length) {
      return <p className="text-gray-500 py-12 text-center">Ingen foreløbige opskrifter i «{status}».</p>
    }
    return (
      <div className="space-y-6">
        {items.map((r) => {
          const e = edits[r.id]
          if (!e) return null
          const editable = r.status === 'pending' || r.status === 'draft'
          return (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 mr-2">
                    {r.source === 'ai-photo' ? '📷 AI fra billede' : '✍️ Byg selv'}
                  </span>
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    {r.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleString('da-DK')} · bruger {r.user_id.slice(0, 8)}
                  </p>
                </div>
                {r.promoted_recipe_id ? (
                  <a
                    href={`/admin/recipes`}
                    className="text-sm text-emerald-600 hover:underline whitespace-nowrap"
                  >
                    Oprettet ↗
                  </a>
                ) : null}
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {/* Billede */}
                <div>
                  <div className="aspect-[4/3] rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                    {e.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.imageUrl} alt={e.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  {editable && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={e.imageUrl}
                        onChange={(ev) => patchEdit(r.id, { imageUrl: ev.target.value })}
                        placeholder="Billede-URL"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      />
                      <label className="inline-flex items-center gap-1 text-sm text-blue-600 cursor-pointer">
                        {uploadingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                        Upload billede
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(ev) => ev.target.files?.[0] && handleUpload(r.id, ev.target.files[0])}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Titel + beskrivelse + kategori */}
                <div className="md:col-span-2 space-y-2">
                  <input
                    type="text"
                    value={e.title}
                    disabled={!editable}
                    onChange={(ev) => patchEdit(r.id, { title: ev.target.value })}
                    className="w-full text-lg font-semibold border-b border-gray-200 focus:border-emerald-400 outline-none py-1 disabled:bg-transparent"
                  />
                  <textarea
                    value={e.description}
                    disabled={!editable}
                    onChange={(ev) => patchEdit(r.id, { description: ev.target.value })}
                    rows={2}
                    placeholder="Beskrivelse"
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <label className="text-gray-500">Kategori</label>
                    <select
                      value={e.mainCategory}
                      disabled={!editable}
                      onChange={(ev) => patchEdit(r.id, { mainCategory: ev.target.value })}
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      {MAIN_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400">
                      {r.servings} port · {r.nutrition?.calories ?? '?'} kcal/port
                    </span>
                  </div>
                </div>
              </div>

              {/* Opklarende spørgsmål */}
              {r.clarifying_questions?.length ? (
                <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Brugerens svar på AI-spørgsmål</p>
                  <ul className="text-sm text-amber-900 space-y-1">
                    {r.clarifying_questions.map((q, i) => (
                      <li key={i}>
                        <span className="font-medium">{q.question}</span>{' '}
                        <span className="text-amber-700">{q.answer ? `— ${q.answer}` : '(ubesvaret)'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* AI-klargøring + kreditering */}
              {editable && (
                <div className="mt-4 bg-violet-50 border border-violet-100 rounded-lg p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => runAiCleanup(r)}
                      disabled={aiBusyId === r.id}
                      className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {aiBusyId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Klargør med AI
                    </button>
                    <span className="text-xs text-violet-700/80">
                      Retter ingredienser til vores format, skriver fremgangsmåden rent (uden at ændre
                      opskriften) og laver en Midjourney-prompt.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <label className="text-gray-600 whitespace-nowrap">Kreditering</label>
                    <input
                      type="text"
                      value={e.credit}
                      onChange={(ev) => patchEdit(r.id, { credit: ev.target.value })}
                      placeholder="Indsendt af …"
                      className="flex-1 border border-gray-300 rounded px-2 py-1"
                    />
                  </div>

                  {e.midjourneyPrompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-violet-800">Midjourney-prompt</span>
                        <button
                          onClick={() => copyPrompt(r.id, e.midjourneyPrompt)}
                          className="inline-flex items-center gap-1 text-xs text-violet-700 hover:text-violet-900"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedId === r.id ? 'Kopieret!' : 'Kopiér'}
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={e.midjourneyPrompt}
                        rows={3}
                        className="w-full text-xs border border-violet-200 rounded px-2 py-1 bg-white font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5 mt-4">
                {/* Ingredienser */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Ingredienser</p>
                  <div className="space-y-1">
                    {e.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <input
                          type="number"
                          value={ing.amount}
                          disabled={!editable}
                          onChange={(ev) => {
                            const next = [...e.ingredients]
                            next[idx] = { ...ing, amount: Number(ev.target.value) }
                            patchEdit(r.id, { ingredients: next })
                          }}
                          className="w-16 text-sm border border-gray-200 rounded px-1 py-0.5"
                        />
                        <input
                          type="text"
                          value={ing.unit}
                          disabled={!editable}
                          onChange={(ev) => {
                            const next = [...e.ingredients]
                            next[idx] = { ...ing, unit: ev.target.value }
                            patchEdit(r.id, { ingredients: next })
                          }}
                          className="w-14 text-sm border border-gray-200 rounded px-1 py-0.5"
                        />
                        <input
                          type="text"
                          value={ing.name}
                          disabled={!editable}
                          onChange={(ev) => {
                            const next = [...e.ingredients]
                            next[idx] = { ...ing, name: ev.target.value }
                            patchEdit(r.id, { ingredients: next })
                          }}
                          className="flex-1 text-sm border border-gray-200 rounded px-1 py-0.5"
                        />
                        {editable && (
                          <button
                            onClick={() =>
                              patchEdit(r.id, { ingredients: e.ingredients.filter((_, i) => i !== idx) })
                            }
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {editable && (
                    <button
                      onClick={() =>
                        patchEdit(r.id, {
                          ingredients: [...e.ingredients, { name: '', amount: 0, unit: 'g', notes: null }],
                        })
                      }
                      className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600"
                    >
                      <Plus className="w-4 h-4" /> Tilføj ingrediens
                    </button>
                  )}
                </div>

                {/* Fremgangsmåde */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Fremgangsmåde (ét trin pr. linje)</p>
                  <textarea
                    value={e.instructionsText}
                    disabled={!editable}
                    onChange={(ev) => patchEdit(r.id, { instructionsText: ev.target.value })}
                    rows={8}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1 font-mono"
                  />
                </div>
              </div>

              {r.review_notes ? (
                <p className="mt-3 text-sm text-red-600">Afvist: {r.review_notes}</p>
              ) : null}

              {editable && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => approve(r)}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Godkend & opret opskrift
                  </button>
                  <button
                    onClick={() => reject(r)}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Afvis
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }, [items, edits, loading, status, busyId, uploadingId, aiBusyId, copiedId])

  if (checking) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Foreløbige opskrifter</h1>
            <p className="text-gray-500 text-sm">Godkend bruger-opskrifter (AI fra billede / byg selv) og opret dem som rigtige opskrifter.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <RefreshCw className="w-4 h-4" /> Opdatér
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                status === t.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {content}
      </div>
    </AdminLayout>
  )
}
