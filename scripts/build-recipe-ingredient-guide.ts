/**
 * Byg public/opskrift-ingredienser.md ud fra publicerede opskrifter.
 *
 *   npx tsx scripts/build-recipe-ingredient-guide.ts
 */
import { config as loadEnv } from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { INGREDIENT_CATEGORY_NAMES, IngredientCategory } from '../src/lib/ingredient-system/types'
import {
  renderRecipeIngredientGuide,
  type GuideIngredient,
} from '../src/lib/recipe-ingredient-guide'

const OUT = resolve(process.cwd(), 'public/opskrift-ingredienser.md')

function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function categoryLabel(value: string | null | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return 'Uden kategori'
  const names = INGREDIENT_CATEGORY_NAMES as Record<string, string>
  if (names[raw]) return names[raw]
  const match = (Object.values(IngredientCategory) as string[]).find((key) => key === raw.toLowerCase())
  return match && names[match] ? names[match] : raw
}

type Line = { name: string; amount: number; unit: string }

function normalizeUnit(unit: string): string {
  const value = unit.toLowerCase().replace(/\./g, '').trim()
  if (['g', 'gr', 'gram', 'grams', 'gam'].includes(value)) return 'g'
  if (['ml', 'milliliter', 'millilitre'].includes(value)) return 'ml'
  if (['stk', 'st', 'styk', 'stykker'].includes(value)) return 'stk'
  if (['spsk', 'spiseske', 'spiseskefuld', 'spiseskefulde'].includes(value)) return 'spsk'
  if (['tsk', 'teske', 'teskefuld', 'teskefulde'].includes(value)) return 'tsk'
  if (['kg', 'kilo'].includes(value)) return 'kg'
  if (value === 'l' || value === 'liter') return 'l'
  if (['fed', 'fedd'].includes(value)) return 'fed'
  return value || 'stk'
}

function asLines(raw: unknown): Line[] {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  const lines: Line[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as { name?: unknown; amount?: unknown; unit?: unknown; ingredients?: unknown }
    if (Array.isArray(row.ingredients)) {
      lines.push(...asLines(row.ingredients))
      continue
    }
    const name = String(row.name || '')
      .trim()
      .toLowerCase()
    const amount = typeof row.amount === 'number' ? row.amount : Number(String(row.amount || '').replace(',', '.'))
    const unit = normalizeUnit(String(row.unit || 'stk'))
    if (name.length < 2 || !Number.isFinite(amount) || amount <= 0) continue
    lines.push({ name, amount, unit })
  }
  return lines
}

async function fetchAll(
  client: SupabaseClient,
  table: string,
  columns: string
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await client.from(table).select(columns).range(from, from + page - 1)
    if (error) throw error
    const rows = data ?? []
    out.push(...(rows as Record<string, unknown>[]))
    if (rows.length < page) break
  }
  return out
}

async function main() {
  const client = getClient()
  const recipes = (
    await fetchAll(client, 'recipes', 'id, status, ingredients, ingredientGroups')
  ).filter((row) => String(row.status || '') === 'published')

  const catalog = await fetchAll(client, 'ingredients', 'name, category, is_basis')
  const byName = new Map<string, { category: string; basis: boolean }>()
  for (const row of catalog) {
    const name = String(row.name || '')
      .trim()
      .toLowerCase()
    if (!name || byName.has(name)) continue
    byName.set(name, {
      category: categoryLabel(typeof row.category === 'string' ? row.category : ''),
      basis: row.is_basis === true,
    })
  }

  const grouped = new Map<string, GuideIngredient>()
  let withLines = 0
  for (const recipe of recipes) {
    const id = String(recipe.id || '')
    const lines = [...asLines(recipe.ingredients), ...asLines(recipe.ingredientGroups)]
    if (!lines.length || !id) continue
    withLines += 1
    const seen = new Set<string>()
    for (const line of lines) {
      const current = grouped.get(line.name) ?? {
        name: line.name,
        category: byName.get(line.name)?.category ?? 'Uden kategori',
        basis: byName.get(line.name)?.basis ?? false,
        recipeIds: [],
        units: [],
      }
      if (!seen.has(line.name)) {
        current.recipeIds.push(id)
        seen.add(line.name)
      }
      const unit = current.units.find((item) => item.unit === line.unit)
      if (unit) unit.amounts.push(line.amount)
      else current.units.push({ unit: line.unit, amounts: [line.amount] })
      grouped.set(line.name, current)
    }
  }

  const markdown = renderRecipeIngredientGuide({
    recipeCount: withLines,
    ingredients: [...grouped.values()],
  })
  mkdirSync(resolve(process.cwd(), 'public'), { recursive: true })
  writeFileSync(OUT, markdown)
  console.log(`wrote ${grouped.size} ingredients from ${withLines} recipes → public/opskrift-ingredienser.md`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
