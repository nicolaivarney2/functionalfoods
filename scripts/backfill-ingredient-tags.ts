/**
 * Backfill ingredient quantity tags ({{ing:<rowId>}}) in recipe instructions.
 *
 * - Sikrer unik `rowId` på hver ingredienslinje
 * - Linker navne i fremgangsmåde → {{ing:rowId}} (idempotent: eksisterende tags
 *   ekspanderes til navne først, derefter re-link)
 *
 * Usage:
 *   npx tsx scripts/backfill-ingredient-tags.ts              # dry-run
 *   npx tsx scripts/backfill-ingredient-tags.ts --apply       # skriv til DB
 *   npx tsx scripts/backfill-ingredient-tags.ts --apply --limit=10
 *   npx tsx scripts/backfill-ingredient-tags.ts --slug=some-slug
 *   npx tsx scripts/backfill-ingredient-tags.ts --status=published
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'

import {
  ensureIngredientRowIds,
  ingredientNameForInstruction,
  ingredientTagId,
  linkIngredientTagsInText,
  type LinkableIngredient,
} from '../src/lib/recipe-ingredient-tags'

const root = process.cwd()

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')
const LIMIT = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0)
const SLUG = args.find((a) => a.startsWith('--slug='))?.split('=')[1] || ''
const STATUS = args.find((a) => a.startsWith('--status='))?.split('=')[1] || ''
const PAGE_SIZE = 200

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(path.join(root, file), 'utf8')
      for (const line of raw.split('\n')) {
        if (!line.includes('=') || line.trim().startsWith('#')) continue
        const i = line.indexOf('=')
        const k = line.slice(0, i).trim()
        let v = line.slice(i + 1).trim()
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1)
        }
        if (!(k in out)) out[k] = v
      }
    } catch {
      /* ignore missing */
    }
  }
  return out
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
const SUPABASE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY i .env.local')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const TAG_RE = /\{\{ing:([a-zA-Z0-9_-]+)\}\}/g

type RecipeRow = {
  id: string
  title: string
  slug: string
  status?: string | null
  ingredients: LinkableIngredient[] | null
  ingredientGroups: Array<{ ingredients?: LinkableIngredient[] }> | null
  instructions: Array<{ instruction?: string }> | null
  instructionGroups: Array<{ steps?: Array<{ instruction?: string }> }> | null
}

function withRowIdsOnRecipe(recipe: RecipeRow): {
  ingredients: LinkableIngredient[]
  ingredientGroups: RecipeRow['ingredientGroups']
  flat: LinkableIngredient[]
} {
  const hasGroups =
    Array.isArray(recipe.ingredientGroups) && recipe.ingredientGroups.length > 0

  if (hasGroups) {
    const ingredientGroups = recipe.ingredientGroups!.map((group) => ({
      ...group,
      ingredients: ensureIngredientRowIds(
        (group.ingredients || []).filter((i) => i?.name)
      ) as LinkableIngredient[],
    }))
    const flat = ingredientGroups.flatMap((g) => g.ingredients || [])
    return {
      ingredients: Array.isArray(recipe.ingredients)
        ? (ensureIngredientRowIds(
            recipe.ingredients.filter((i) => i?.name)
          ) as LinkableIngredient[])
        : flat,
      ingredientGroups,
      flat,
    }
  }

  const ingredients = ensureIngredientRowIds(
    (recipe.ingredients || []).filter((i) => i?.name)
  ) as LinkableIngredient[]
  return { ingredients, ingredientGroups: recipe.ingredientGroups, flat: ingredients }
}

/** Expand existing tags back to plain ingredient names (makes re-runs safe). */
function detagToNames(text: string, ingredients: LinkableIngredient[]): string {
  const byTag = new Map<string, LinkableIngredient>()
  for (const ing of ingredients) {
    const tagId = ingredientTagId(ing)
    if (tagId) byTag.set(tagId, ing)
    if (ing.id && !byTag.has(ing.id)) byTag.set(ing.id, ing)
  }
  return String(text || '').replace(TAG_RE, (_full, id: string) => {
    const found = byTag.get(id)
    return found ? ingredientNameForInstruction(found.name) : ''
  })
}

function countTags(text: string): number {
  return (String(text || '').match(TAG_RE) || []).length
}

function relinkSteps<T extends { instruction?: string }>(
  steps: T[] | null | undefined,
  ingredients: LinkableIngredient[],
  seenIds: Set<string>
): T[] {
  return (steps || []).map((step) => {
    const plain = detagToNames(String(step.instruction || ''), ingredients)
    return {
      ...step,
      instruction: linkIngredientTagsInText(plain, ingredients, { seenIds }),
    }
  })
}

async function fetchRecipes(): Promise<RecipeRow[]> {
  if (SLUG) {
    let q = sb
      .from('recipes')
      .select(
        'id, title, slug, status, ingredients, ingredientGroups, instructions, instructionGroups'
      )
      .eq('slug', SLUG)
    if (STATUS) q = q.eq('status', STATUS)
    const { data, error } = await q
    if (error) throw error
    return (data || []) as RecipeRow[]
  }

  const all: RecipeRow[] = []
  let from = 0
  for (;;) {
    let q = sb
      .from('recipes')
      .select(
        'id, title, slug, status, ingredients, ingredientGroups, instructions, instructionGroups'
      )
      .order('updatedAt', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (STATUS) q = q.eq('status', STATUS)

    const { data, error } = await q
    if (error) throw error
    const batch = (data || []) as RecipeRow[]
    all.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
    if (LIMIT > 0 && all.length >= LIMIT) break
  }

  return LIMIT > 0 ? all.slice(0, LIMIT) : all
}

async function main() {
  const recipes = await fetchRecipes()

  console.log(
    `\n${APPLY ? '🚀 APPLY' : '🔍 DRY-RUN'} — ${recipes.length} opskrifter${
      STATUS ? ` (status=${STATUS})` : ''
    }\n${'='.repeat(60)}`
  )

  let changed = 0
  let skipped = 0
  let totalTags = 0
  const failures: Array<{ title: string; error: string }> = []

  for (const recipe of recipes) {
    const {
      ingredients,
      ingredientGroups,
      flat: linkIngredients,
    } = withRowIdsOnRecipe(recipe)

    if (linkIngredients.length === 0) {
      skipped++
      continue
    }

    const hasInstructionGroups =
      Array.isArray(recipe.instructionGroups) && recipe.instructionGroups.length > 0

    let newInstructions = recipe.instructions
    let newGroups = recipe.instructionGroups

    // Én ordinal-sekvens på tværs af alle trin (grupper først, derefter flat)
    const seenIds = new Set<string>()

    if (hasInstructionGroups) {
      newGroups = recipe.instructionGroups!.map((group) => ({
        ...group,
        steps: relinkSteps(group.steps, linkIngredients, seenIds),
      }))
    }

    if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
      newInstructions = relinkSteps(recipe.instructions, linkIngredients, seenIds)
    }

    const before = JSON.stringify({
      ingredients: recipe.ingredients,
      ingredientGroups: recipe.ingredientGroups,
      i: recipe.instructions,
      g: recipe.instructionGroups,
    })
    const after = JSON.stringify({
      ingredients,
      ingredientGroups,
      i: newInstructions,
      g: newGroups,
    })

    const tagCount =
      (newInstructions || []).reduce((n, s) => n + countTags(String(s.instruction)), 0) +
      (newGroups || []).reduce(
        (n, g) =>
          n + (g.steps || []).reduce((m, s) => m + countTags(String(s.instruction)), 0),
        0
      )

    if (before === after) {
      skipped++
      if (VERBOSE) console.log(`⏭️  ${recipe.title} (uændret, ${tagCount} tags)`)
      continue
    }

    changed++
    totalTags += tagCount
    console.log(`\n✏️  ${recipe.title}  →  ${tagCount} tags`)

    if (VERBOSE || !APPLY) {
      const preview = (newInstructions || newGroups?.[0]?.steps || []).slice(0, 3)
      for (const step of preview) {
        const readable = String(step.instruction).replace(TAG_RE, (_f, id: string) => {
          const ing =
            linkIngredients.find((i) => ingredientTagId(i) === id) ||
            linkIngredients.find((i) => i.id === id)
          if (!ing) return '[?]'
          return `[${ing.amount} ${ing.unit} ${ingredientNameForInstruction(ing.name)}]`
        })
        console.log(`    ${readable}`)
      }
    }

    if (APPLY) {
      const payload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
        ingredients,
      }
      if (ingredientGroups && ingredientGroups.length > 0) {
        payload.ingredientGroups = ingredientGroups
      }
      if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
        payload.instructions = newInstructions
      }
      if (hasInstructionGroups) payload.instructionGroups = newGroups

      const { error: upErr } = await sb.from('recipes').update(payload).eq('id', recipe.id)
      if (upErr) {
        failures.push({ title: recipe.title, error: upErr.message })
        console.log(`    ❌ ${upErr.message}`)
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Ændret:   ${changed}`)
  console.log(`Uændret:  ${skipped}`)
  console.log(`Tags:     ${totalTags}`)
  if (failures.length) {
    console.log(`\n❌ Fejl (${failures.length}):`)
    for (const f of failures) console.log(`  - ${f.title}: ${f.error}`)
  }
  if (!APPLY) {
    console.log('\nℹ️  Dry-run — intet gemt. Kør med --apply for at gemme.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
