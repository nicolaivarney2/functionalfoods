'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  BookOpen,
  Link2,
  Loader2,
  Mic,
  PenLine,
  Search,
  Square,
  X,
} from 'lucide-react'
import type { Recipe } from '@/types/recipe'
import type { ProvisionalRecipeRow } from '@/lib/provisional-recipes'
import {
  addDiaryEntry,
  analyzeVoice,
  importRecipeFromLink,
  logMealToDiary,
  MEAL_LABELS,
  type MealType,
} from '@/lib/diary-client'

type Tab = 'recipe' | 'link' | 'manual' | 'voice'

type Props = {
  open: boolean
  meal: MealType
  date: string
  onClose: () => void
  onLogged: () => void
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Kunne ikke læse lydfil'))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(new Error('Kunne ikke læse lydfil'))
    reader.readAsDataURL(blob)
  })
}

export default function AddMealSheet({ open, meal, date, onClose, onLogged }: Props) {
  const [tab, setTab] = useState<Tab>('recipe')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Catalog
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [query, setQuery] = useState('')
  const loadedRef = useRef(false)

  // Link
  const [linkUrl, setLinkUrl] = useState('')
  const [provisional, setProvisional] = useState<ProvisionalRecipeRow | null>(null)
  const [portions, setPortions] = useState(1)

  // Manual
  const [manualTitle, setManualTitle] = useState('')
  const [manualKcal, setManualKcal] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [manualFat, setManualFat] = useState('')

  // Voice
  const [recording, setRecording] = useState(false)
  const [voiceSeconds, setVoiceSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open) return
    setTab('recipe')
    setError(null)
    setQuery('')
    setLinkUrl('')
    setProvisional(null)
    setPortions(1)
    setManualTitle('')
    setManualKcal('')
    setManualProtein('')
    setManualCarbs('')
    setManualFat('')
    setBusy(false)
  }, [open, meal, date])

  useEffect(() => {
    if (!open || loadedRef.current) return
    loadedRef.current = true
    setRecipesLoading(true)
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((data) => {
        const list = data.recipes ?? data
        setRecipes(Array.isArray(list) ? list : [])
      })
      .catch(() => setRecipes([]))
      .finally(() => setRecipesLoading(false))
  }, [open])

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      mediaRecorderRef.current?.stop()
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes.slice(0, 40)
    return recipes
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      )
      .slice(0, 40)
  }, [recipes, query])

  if (!open) return null

  const logCatalog = async (r: Recipe) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const kcal = Number(r.calories ?? r.nutritionalInfo?.calories ?? 0)
      await addDiaryEntry({
        date,
        mealType: meal,
        recipeId: r.id,
        recipeSlug: r.slug,
        title: r.title,
        imageUrl: r.imageUrl,
        servings: 1,
        calories: kcal,
        protein: Number(r.protein ?? r.nutritionalInfo?.protein ?? 0) || undefined,
        carbs: Number(r.carbs ?? r.nutritionalInfo?.carbs ?? 0) || undefined,
        fat: Number(r.fat ?? r.nutritionalInfo?.fat ?? 0) || undefined,
        fiber: Number(r.fiber ?? r.nutritionalInfo?.fiber ?? 0) || undefined,
      })
      onLogged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke logge')
    } finally {
      setBusy(false)
    }
  }

  const importLink = async () => {
    if (busy || !linkUrl.trim()) return
    setBusy(true)
    setError(null)
    try {
      const row = await importRecipeFromLink(linkUrl.trim())
      setProvisional(row)
      setPortions(1)
      setTab('link')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente link')
    } finally {
      setBusy(false)
    }
  }

  const logProvisional = async (row: ProvisionalRecipeRow) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await logMealToDiary({
        date,
        mealType: meal,
        title: row.title,
        imageUrl: row.image_url,
        servings: row.servings || 1,
        portionsLogged: portions,
        ingredients: row.ingredients ?? [],
        provisionalId: row.id,
        aiFallback: row.nutrition ?? undefined,
      })
      onLogged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke logge måltid')
    } finally {
      setBusy(false)
    }
  }

  const logManual = async () => {
    const title = manualTitle.trim()
    const calories = Number(manualKcal)
    if (!title) {
      setError('Angiv en titel')
      return
    }
    if (!Number.isFinite(calories) || calories <= 0) {
      setError('Angiv kalorier (kcal)')
      return
    }
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await addDiaryEntry({
        date,
        mealType: meal,
        title,
        source: 'manual',
        servings: 1,
        calories,
        protein: Number(manualProtein) || undefined,
        carbs: Number(manualCarbs) || undefined,
        fat: Number(manualFat) || undefined,
      })
      onLogged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme')
    } finally {
      setBusy(false)
    }
  }

  const startVoice = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : undefined
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      mediaRecorderRef.current = recorder
      recorder.start(250)
      setRecording(true)
      setVoiceSeconds(0)
      tickRef.current = setInterval(() => setVoiceSeconds((s) => s + 1), 1000)
    } catch {
      setError('Mikrofonadgang blev nægtet. Tillad mikrofon i browseren, eller brug link/manuel logning.')
    }
  }

  const stopVoice = async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    setRecording(false)

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
        recorder.stream.getTracks().forEach((t) => t.stop())
      }
      recorder.stop()
    })

    if (voiceSeconds < 3) {
      setError('Optag mindst et par sekunder, så vi kan høre hvad du har spist.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const dataUrl = await blobToBase64(blob)
      const { recipe } = await analyzeVoice(dataUrl, blob.type || 'audio/webm')
      setProvisional(recipe)
      setPortions(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke analysere stemme')
    } finally {
      setBusy(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: 'recipe', label: 'Opskrift', icon: BookOpen },
    { id: 'link', label: 'Link', icon: Link2 },
    { id: 'manual', label: 'Manuel', icon: PenLine },
    { id: 'voice', label: 'Stemme', icon: Mic },
  ]

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Luk" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Tilføj {MEAL_LABELS[meal].toLowerCase()}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">Log måltid</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Luk"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-100 px-2 py-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                tab === id
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {error ? (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {tab === 'recipe' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Søg efter en ret…"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {recipesLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                  <Loader2 className="animate-spin" size={18} />
                  Henter opskrifter…
                </div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((r) => {
                    const kcal = Number(r.calories ?? r.nutritionalInfo?.calories ?? 0)
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void logCatalog(r)}
                          className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-2 text-left hover:border-emerald-200 hover:bg-emerald-50/40 disabled:opacity-60"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {r.imageUrl ? (
                              <Image src={r.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{r.title}</p>
                            <p className="text-xs text-gray-500">
                              {kcal > 0 ? `${Math.round(kcal)} kcal / portion` : 'Log opskrift'}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-emerald-700">Log</span>
                        </button>
                      </li>
                    )
                  })}
                  {!filtered.length ? (
                    <p className="py-6 text-center text-sm text-gray-500">Ingen opskrifter matcher.</p>
                  ) : null}
                </ul>
              )}
            </div>
          ) : null}

          {tab === 'link' ? (
            <div className="space-y-4">
              {!provisional ? (
                <>
                  <p className="text-sm text-gray-600">
                    Indsæt et link til en opskrift — vi henter ingredienser og beregner næring.
                  </p>
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={busy || !linkUrl.trim()}
                    onClick={() => void importLink()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
                    Hent opskrift
                  </button>
                </>
              ) : (
                <ProvisionalPreview
                  row={provisional}
                  portions={portions}
                  onPortions={setPortions}
                  busy={busy}
                  onLog={() => void logProvisional(provisional)}
                  onReset={() => setProvisional(null)}
                />
              )}
            </div>
          ) : null}

          {tab === 'manual' ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Hurtig manuel logning — fx frokost ude eller en snack.</p>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Titel</span>
                <input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Fx Skyr med bær"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Kcal *</span>
                  <input
                    type="number"
                    min={1}
                    value={manualKcal}
                    onChange={(e) => setManualKcal(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Protein (g)</span>
                  <input
                    type="number"
                    min={0}
                    value={manualProtein}
                    onChange={(e) => setManualProtein(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Kulhydrat (g)</span>
                  <input
                    type="number"
                    min={0}
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Fedt (g)</span>
                  <input
                    type="number"
                    min={0}
                    value={manualFat}
                    onChange={(e) => setManualFat(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void logManual()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : null}
                Gem i dagbog
              </button>
            </div>
          ) : null}

          {tab === 'voice' ? (
            <div className="space-y-4 text-center">
              {provisional ? (
                <ProvisionalPreview
                  row={provisional}
                  portions={portions}
                  onPortions={setPortions}
                  busy={busy}
                  onLog={() => void logProvisional(provisional)}
                  onReset={() => setProvisional(null)}
                />
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Sig fx «jeg spiste skyr med bær og nødder» — vi laver et bud på måltidet og næringen.
                  </p>
                  <div className="flex flex-col items-center gap-3 py-4">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void (recording ? stopVoice() : startVoice())}
                      className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-sm transition ${
                        recording ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'
                      } disabled:opacity-50`}
                      aria-label={recording ? 'Stop optagelse' : 'Start optagelse'}
                    >
                      {busy ? (
                        <Loader2 className="animate-spin" size={28} />
                      ) : recording ? (
                        <Square size={28} fill="currentColor" />
                      ) : (
                        <Mic size={28} />
                      )}
                    </button>
                    <p className="text-sm font-medium text-gray-800">
                      {busy
                        ? 'Analyserer…'
                        : recording
                          ? `Optager… ${voiceSeconds}s`
                          : 'Tryk for at optage'}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ProvisionalPreview({
  row,
  portions,
  onPortions,
  busy,
  onLog,
  onReset,
}: {
  row: ProvisionalRecipeRow
  portions: number
  onPortions: (n: number) => void
  busy: boolean
  onLog: () => void
  onReset: () => void
}) {
  const kcal = Number(row.nutrition?.calories ?? 0)
  return (
    <div className="space-y-3 text-left">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
        <p className="font-semibold text-gray-900">{row.title}</p>
        <p className="mt-1 text-xs text-gray-600">
          {row.ingredients?.length ?? 0} ingredienser
          {kcal > 0 ? ` · ca. ${Math.round(kcal)} kcal / portion` : ''}
        </p>
        {row.ingredients?.length ? (
          <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-xs text-gray-600">
            {row.ingredients.slice(0, 12).map((ing, i) => (
              <li key={`${ing.name}-${i}`}>
                {ing.amount} {ing.unit} {ing.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Portioner spist</span>
        <input
          type="number"
          min={0.25}
          step={0.25}
          value={portions}
          onChange={(e) => onPortions(Math.max(0.25, Number(e.target.value) || 1))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Fortryd
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onLog}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : null}
          Log i dagbog
        </button>
      </div>
    </div>
  )
}
