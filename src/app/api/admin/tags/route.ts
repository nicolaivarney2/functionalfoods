import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export type TagField = 'mainCategory' | 'subCategories' | 'dietaryCategories'

interface TagSummary {
  name: string
  count: number
  // Normalised key for grouping case/whitespace duplicates
  normalised: string
}

interface SimilarTagGroup {
  field: TagField
  normalised: string
  variants: Array<{ name: string; count: number }>
}

interface TagOverviewResponse {
  recipeCount: number
  mainCategories: TagSummary[]
  subCategories: TagSummary[]
  dietaryCategories: TagSummary[]
  // Stats for the cleanup panel
  cleanup: {
    missingMainCategory: number
    missingSubCategories: number
    missingDietaryCategories: number
    untagged: number
    rareTags: {
      mainCategory: TagSummary[]
      subCategories: TagSummary[]
      dietaryCategories: TagSummary[]
    }
    similarTags: SimilarTagGroup[]
  }
}

function normaliseTag(value: string): string {
  return value.trim().toLowerCase()
}

function pushTagCount(
  map: Map<string, { name: string; count: number; normalised: string }>,
  raw: unknown,
): void {
  if (typeof raw !== 'string') return
  const trimmed = raw.trim()
  if (!trimmed) return
  const normalised = normaliseTag(trimmed)
  const existing = map.get(trimmed)
  if (existing) {
    existing.count += 1
    return
  }
  map.set(trimmed, { name: trimmed, count: 1, normalised })
}

function toSortedArray(
  map: Map<string, { name: string; count: number; normalised: string }>,
): TagSummary[] {
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da'))
}

function findSimilarGroups(tags: TagSummary[], field: TagField): SimilarTagGroup[] {
  const groups = new Map<string, TagSummary[]>()
  for (const tag of tags) {
    const list = groups.get(tag.normalised) ?? []
    list.push(tag)
    groups.set(tag.normalised, list)
  }
  const result: SimilarTagGroup[] = []
  for (const [normalised, variants] of groups.entries()) {
    if (variants.length < 2) continue
    result.push({
      field,
      normalised,
      variants: variants
        .map((v) => ({ name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da')),
    })
  }
  return result.sort((a, b) => a.normalised.localeCompare(b.normalised, 'da'))
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    })

    // Pull only the columns we need – keep payload small even with thousands of recipes.
    const { data, error } = await supabase
      .from('recipes')
      .select('id, mainCategory, subCategories, dietaryCategories')

    if (error) {
      console.error('❌ Error fetching recipes for tag overview:', error)
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }

    const recipes = data ?? []
    const mainMap = new Map<string, { name: string; count: number; normalised: string }>()
    const subMap = new Map<string, { name: string; count: number; normalised: string }>()
    const dietMap = new Map<string, { name: string; count: number; normalised: string }>()

    let missingMain = 0
    let missingSub = 0
    let missingDiet = 0
    let untagged = 0

    for (const recipe of recipes) {
      const main = typeof recipe.mainCategory === 'string' ? recipe.mainCategory.trim() : ''
      const subs = Array.isArray(recipe.subCategories)
        ? recipe.subCategories.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
        : []
      const diets = Array.isArray(recipe.dietaryCategories)
        ? recipe.dietaryCategories.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
        : []

      if (main) {
        pushTagCount(mainMap, main)
      } else {
        missingMain += 1
      }

      if (subs.length === 0) {
        missingSub += 1
      } else {
        for (const s of subs) pushTagCount(subMap, s)
      }

      if (diets.length === 0) {
        missingDiet += 1
      } else {
        for (const d of diets) pushTagCount(dietMap, d)
      }

      if (!main && subs.length === 0 && diets.length === 0) {
        untagged += 1
      }
    }

    const mainCategories = toSortedArray(mainMap)
    const subCategories = toSortedArray(subMap)
    const dietaryCategories = toSortedArray(dietMap)

    const RARE_THRESHOLD = 2
    const rareTags = {
      mainCategory: mainCategories.filter((t) => t.count <= RARE_THRESHOLD),
      subCategories: subCategories.filter((t) => t.count <= RARE_THRESHOLD),
      dietaryCategories: dietaryCategories.filter((t) => t.count <= RARE_THRESHOLD),
    }

    const similarTags = [
      ...findSimilarGroups(mainCategories, 'mainCategory'),
      ...findSimilarGroups(subCategories, 'subCategories'),
      ...findSimilarGroups(dietaryCategories, 'dietaryCategories'),
    ]

    const response: TagOverviewResponse = {
      recipeCount: recipes.length,
      mainCategories,
      subCategories,
      dietaryCategories,
      cleanup: {
        missingMainCategory: missingMain,
        missingSubCategories: missingSub,
        missingDietaryCategories: missingDiet,
        untagged,
        rareTags,
        similarTags,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Error in /api/admin/tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tag overview' }, { status: 500 })
  }
}
