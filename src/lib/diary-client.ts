/**
 * Maddagbog — klient mod /api/diary/* (samme kontrakt som Expo-appen).
 */

import { authFetch } from '@/lib/auth-fetch'
import type { ProvisionalRecipeRow } from '@/lib/provisional-recipes'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type DiaryEntry = {
  id: string
  loggedDate: string
  mealType: MealType
  source: 'recipe' | 'manual' | 'meal-plan'
  recipeId: string | null
  recipeSlug: string | null
  title: string
  imageUrl: string | null
  servings: number
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}

export type DiaryTarget = {
  calories: number
  protein: number
  carbs: number
  fat: number
  bmr: number
  tdee: number
  dietaryApproach: string | null
}

export type DiaryTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}

export type DiaryDay = {
  date: string
  target: DiaryTarget | null
  totals: DiaryTotals
  entries: DiaryEntry[]
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseMicroField(v: unknown): Record<string, number> | undefined {
  if (!v || typeof v !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(val)
    if (Number.isFinite(n) && n > 0) out[k] = n
  }
  return Object.keys(out).length ? out : undefined
}

function mapEntry(row: Record<string, unknown>): DiaryEntry {
  return {
    id: String(row.id),
    loggedDate: String(row.logged_date ?? ''),
    mealType: row.meal_type as MealType,
    source:
      row.source === 'manual' ? 'manual' : row.source === 'meal-plan' ? 'meal-plan' : 'recipe',
    recipeId: (row.recipe_id as string | null) ?? null,
    recipeSlug: (row.recipe_slug as string | null) ?? null,
    title: String(row.title ?? ''),
    imageUrl: (row.image_url as string | null) ?? null,
    servings: num(row.servings) || 1,
    calories: num(row.calories),
    protein: numOrNull(row.protein),
    carbs: numOrNull(row.carbs),
    fat: numOrNull(row.fat),
    fiber: numOrNull(row.fiber),
    vitamins: parseMicroField(row.vitamins),
    minerals: parseMicroField(row.minerals),
  }
}

/** Lokal dato → YYYY-MM-DD (matcher brugerens kalender, ikke UTC). */
export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

async function readJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; details?: string }
  if (!res.ok) {
    const msg =
      typeof json?.error === 'string'
        ? json.error
        : `Fejl ${res.status}`
    const details = typeof (json as { details?: string }).details === 'string'
      ? ` — ${(json as { details: string }).details}`
      : ''
    throw new Error(`${msg}${details}`)
  }
  return json
}

export async function loadDiaryDay(date: string, signal?: AbortSignal): Promise<DiaryDay> {
  const res = await authFetch(`/api/diary/day?date=${encodeURIComponent(date)}`, { signal })
  const data = await readJson<{
    date: string
    target: DiaryTarget | null
    totals: DiaryTotals
    entries: Record<string, unknown>[]
  }>(res)
  return {
    date: data.date,
    target: data.target ?? null,
    totals: data.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    entries: (data.entries ?? []).map(mapEntry),
  }
}

export type AddEntryInput = {
  date: string
  mealType: MealType
  recipeId?: string
  recipeSlug?: string
  title: string
  imageUrl?: string
  servings?: number
  source?: 'manual' | 'recipe'
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

export async function addDiaryEntry(input: AddEntryInput): Promise<DiaryEntry> {
  const res = await authFetch('/api/diary/entries', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = await readJson<{ data: Record<string, unknown> }>(res)
  return mapEntry(data.data)
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  const res = await authFetch(`/api/diary/entries?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  await readJson(res)
}

export async function moveDiaryEntry(input: {
  id: string
  date?: string
  mealType?: MealType
}): Promise<DiaryEntry> {
  const res = await authFetch('/api/diary/entries', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  const data = await readJson<{ data: Record<string, unknown> }>(res)
  return mapEntry(data.data)
}

export type LogMealInput = {
  date: string
  mealType: MealType
  title: string
  imageUrl?: string | null
  servings?: number
  portionsLogged?: number
  ingredients: { name: string; amount: number; unit: string; notes?: string | null }[]
  provisionalId?: string
  aiFallback?: { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }
}

export async function logMealToDiary(input: LogMealInput): Promise<DiaryEntry> {
  const res = await authFetch('/api/diary/log-meal', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = await readJson<{ data: Record<string, unknown> }>(res)
  return mapEntry(data.data)
}

export async function syncMealPlanToDiary(opts?: {
  mealPlanId?: string
  fromDate?: string
}): Promise<{ inserted: number; weekStart?: string; weekEnd?: string }> {
  const res = await authFetch('/api/diary/sync-meal-plan', {
    method: 'POST',
    body: JSON.stringify(opts ?? {}),
  })
  return readJson(res)
}

export async function importRecipeFromLink(url: string): Promise<ProvisionalRecipeRow> {
  const res = await authFetch('/api/recipes/from-link', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
  const data = await readJson<{ data: ProvisionalRecipeRow }>(res)
  return data.data
}

export async function analyzeVoice(
  audioBase64: string,
  mimeType?: string
): Promise<{ recipe: ProvisionalRecipeRow; transcript?: string }> {
  const res = await authFetch('/api/recipes/from-voice', {
    method: 'POST',
    body: JSON.stringify({ audioBase64, mimeType }),
  })
  const data = await readJson<{ data: ProvisionalRecipeRow; transcript?: string }>(res)
  return { recipe: data.data, transcript: data.transcript }
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Morgenmad',
  lunch: 'Frokost',
  dinner: 'Aftensmad',
  snack: 'Snack',
}

export const MEAL_BANDS: Record<MealType, [number, number]> = {
  breakfast: [0.25, 0.35],
  lunch: [0.3, 0.4],
  dinner: [0.3, 0.4],
  snack: [0.05, 0.15],
}

export const MEAL_KEYS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
