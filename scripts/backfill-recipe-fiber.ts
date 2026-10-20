/**
 * Skriv kun kostfibre på opskrifter ud fra eksisterende Frida-matches.
 * Rører ikke kalorier, protein, kulhydrat, fedt, vitaminer eller matches.
 *
 *   npx tsx scripts/backfill-recipe-fiber.ts
 *   npx tsx scripts/backfill-recipe-fiber.ts --apply
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import {
  householdGramsFromMap,
  householdGramsFromName,
  type HouseholdUnitMap,
} from '../src/lib/frida-household-units'

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true })

const APPLY = process.argv.includes('--apply')
const PAGE = 1000
const SUSPICIOUS_PER_PORTION = 80

type IngredientLine = { name?: string; amount?: number | string; unit?: string }

function cleanRecipeIngredientName(raw: string): string {
  let s = String(raw || '').toLowerCase().trim()
  s = s
    .replace(
      /^\d+[.,]?\d*\s*(stk|st|styk|stykker|skive|skiver|fed|glas|kop|dl|ml|l|g|gram|kg|mg|tsk|tesk|spsk|bdt|bundt|håndfuld|håndfulde)\s+/i,
      ''
    )
    .replace(/^\d+[.,]?\d*\s*/, '')
    .trim()
  return s
}

/** Samme gram-omregning som recipe-frida-nutrition-recalc.convertToGrams. */
function convertToGrams(
  amount: number,
  unit: string,
  options?: { gramsPerPiece?: number | null; householdUnits?: HouseholdUnitMap | null; foodName?: string | null }
): number {
  const u = (unit || '').toLowerCase().trim()
  const fromFrida = householdGramsFromMap(options?.householdUnits, u)
  if (fromFrida != null) return amount * fromFrida
  const fromName = options?.foodName ? householdGramsFromName(options.foodName, u) : null
  if (fromName != null) return amount * fromName

  const pieceUnits = new Set(['stk', 'st', 'stykke', 'stykker', 'styk'])
  const perPiece =
    options?.gramsPerPiece != null && Number.isFinite(Number(options.gramsPerPiece)) && Number(options.gramsPerPiece) > 0
      ? Number(options.gramsPerPiece)
      : null
  if (pieceUnits.has(u) && perPiece != null) return amount * perPiece

  const conversions: Record<string, number> = {
    g: 1,
    gram: 1,
    kg: 1000,
    kilo: 1000,
    stk: 80,
    st: 80,
    stykke: 80,
    stykker: 80,
    styk: 80,
    skive: 45,
    skiver: 45,
    fed: 3,
    glas: 200,
    kop: 150,
    spsk: 13,
    tesk: 4,
    tsk: 4,
    dl: 100,
    l: 1000,
    ml: 1,
  }
  return amount * (conversions[u] ?? 100)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

async function loadAll<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data || []) as T[]))
    if (!data || data.length < PAGE) break
  }
  return out
}

function getService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

async function main() {
  const supabase = getService()
  const [catalog, matches, foods, recipes] = await Promise.all([
    loadAll<{ id: string; name: string; grams_per_unit: number | null }>(
      supabase,
      'ingredients',
      'id, name, grams_per_unit'
    ),
    loadAll<{ recipe_ingredient_id: string; frida_ingredient_id: string; is_manual: boolean }>(
      supabase,
      'ingredient_matches',
      'recipe_ingredient_id, frida_ingredient_id, is_manual'
    ),
    loadAll<{ id: string; name: string; fiber: number | null; household_units: HouseholdUnitMap | null }>(
      supabase,
      'frida_ingredients',
      'id, name, fiber, household_units'
    ),
    loadAll<{ id: string; title: string; servings: number | null; fiber: number | null; ingredients: IngredientLine[] | null }>(
      supabase,
      'recipes',
      'id, title, servings, fiber, ingredients'
    ),
  ])

  const foodById = new Map(foods.map((f) => [f.id, f]))
  const matchByCatalog = new Map<string, string>()
  for (const match of matches) {
    if (!match.recipe_ingredient_id || !match.frida_ingredient_id) continue
    const existing = matchByCatalog.get(match.recipe_ingredient_id)
    if (!existing || match.is_manual) matchByCatalog.set(match.recipe_ingredient_id, match.frida_ingredient_id)
  }

  const catalogByName = new Map<string, { id: string; gramsPerUnit: number | null }>()
  for (const row of catalog) {
    const key = String(row.name || '').toLowerCase().trim()
    if (!key) continue
    const current = catalogByName.get(key)
    const hasMatch = matchByCatalog.has(row.id)
    if (!current || (hasMatch && !matchByCatalog.has(current.id))) {
      catalogByName.set(key, {
        id: row.id,
        gramsPerUnit: row.grams_per_unit != null ? Number(row.grams_per_unit) : null,
      })
    }
  }

  type Update = {
    id: string
    title: string
    before: number
    fiber: number
    totalFiber: number
    matched: number
    total: number
  }
  const updates: Update[] = []
  let skippedNoLines = 0
  let skippedNoMatch = 0
  let unchanged = 0
  let suspicious = 0

  for (const recipe of recipes) {
    const lines = Array.isArray(recipe.ingredients) ? recipe.ingredients.filter((l) => String(l?.name || '').trim()) : []
    if (lines.length === 0) {
      skippedNoLines += 1
      continue
    }
    const servings = Math.max(1, Number(recipe.servings) || 1)
    let totalFiber = 0
    let matched = 0
    for (const line of lines) {
      const cleaned = cleanRecipeIngredientName(String(line.name || ''))
      const catalogRow = catalogByName.get(cleaned)
      const fridaId = catalogRow ? matchByCatalog.get(catalogRow.id) : undefined
      const food = fridaId ? foodById.get(fridaId) : undefined
      if (!food) continue
      matched += 1
      const amount = Number(line.amount) || 0
      const grams = convertToGrams(amount, String(line.unit || ''), {
        gramsPerPiece: catalogRow?.gramsPerUnit,
        householdUnits: food.household_units,
        foodName: food.name,
      })
      totalFiber += (Number(food.fiber) || 0) * (grams / 100)
    }
    if (matched === 0) {
      skippedNoMatch += 1
      continue
    }
    const fiber = round1(totalFiber / servings)
    const total = round1(totalFiber)
    if (fiber > SUSPICIOUS_PER_PORTION) {
      suspicious += 1
      console.log(`! springer over ${recipe.id}  ${recipe.title}  fiber/portion=${fiber} (${matched}/${lines.length})`)
      continue
    }
    const before = round1(Number(recipe.fiber) || 0)
    if (before === fiber) {
      unchanged += 1
      continue
    }
    updates.push({ id: recipe.id, title: recipe.title, before, fiber, totalFiber: total, matched, total: lines.length })
  }

  updates.sort((a, b) => b.fiber - a.fiber)
  console.log(APPLY ? 'Skriver fiber' : 'Tørkørsel — ingen skrivning')
  console.log(
    `opskrifter=${recipes.length}  opdateres=${updates.length}  uændret=${unchanged}  uden match=${skippedNoMatch}  uden ingredienser=${skippedNoLines}  mistænkelige=${suspicious}`
  )
  console.log('Højeste 8:')
  for (const row of updates.slice(0, 8)) {
    console.log(`  ${row.before} → ${row.fiber} g  (${row.matched}/${row.total})  ${row.title}`)
  }

  if (!APPLY) return

  let written = 0
  for (let i = 0; i < updates.length; i += 20) {
    const chunk = updates.slice(i, i + 20)
    await Promise.all(
      chunk.map(async (row) => {
        const { error } = await supabase
          .from('recipes')
          .update({ fiber: row.fiber, total_fiber: row.totalFiber })
          .eq('id', row.id)
        if (error) throw new Error(`${row.id}: ${error.message}`)
        written += 1
      })
    )
  }
  console.log(`Skrev fiber på ${written} opskrifter.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
