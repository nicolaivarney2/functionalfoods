import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type MissingField = 'mainCategory' | 'subCategories' | 'dietaryCategories' | 'untagged'

const ALL_MISSING: ReadonlyArray<MissingField> = [
  'mainCategory',
  'subCategories',
  'dietaryCategories',
  'untagged',
]

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50
const CANDIDATE_BATCH = 1000
const MAX_CANDIDATES = 10_000

function parseList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

function parseMissing(value: string | null): MissingField[] {
  const list = parseList(value).filter((v): v is MissingField =>
    ALL_MISSING.includes(v as MissingField),
  )
  return Array.from(new Set(list))
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function parseOptionalInt(value: string | null, min: number, max: number): number | null {
  if (value === null || value === '') return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return null
  if (parsed < min || parsed > max) return null
  return parsed
}

interface FilteredRecipe {
  id: string
  title: string
  slug: string
  imageUrl: string | null
  mainCategory: string | null
  subCategories: string[]
  dietaryCategories: string[]
  status: string | null
  updatedAt: string | null
}

function rowToRecipe(row: any): FilteredRecipe {
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    slug: typeof row.slug === 'string' ? row.slug : '',
    imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : null,
    mainCategory:
      typeof row.mainCategory === 'string' && row.mainCategory.trim().length > 0
        ? row.mainCategory
        : null,
    subCategories: Array.isArray(row.subCategories)
      ? (row.subCategories as unknown[]).filter(
          (v): v is string => typeof v === 'string' && v.trim().length > 0,
        )
      : [],
    dietaryCategories: Array.isArray(row.dietaryCategories)
      ? (row.dietaryCategories as unknown[]).filter(
          (v): v is string => typeof v === 'string' && v.trim().length > 0,
        )
      : [],
    status: typeof row.status === 'string' ? row.status : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  }
}

function hasAllCaseInsensitive(values: string[], required: string[]): boolean {
  if (required.length === 0) return true
  const lower = new Set(values.map((v) => v.toLowerCase()))
  return required.every((r) => lower.has(r.toLowerCase()))
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
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

    const { searchParams } = new URL(request.url)
    const mainCategories = parseList(searchParams.get('mainCategory'))
    const subCategories = parseList(searchParams.get('subCategories'))
    const dietaryCategories = parseList(searchParams.get('dietaryCategories'))
    const missing = parseMissing(searchParams.get('missing'))
    const search = (searchParams.get('search') || '').trim()
    const limit = clampInt(searchParams.get('limit'), 1, MAX_LIMIT, DEFAULT_LIMIT)
    const offset = clampInt(searchParams.get('offset'), 0, 100_000, 0)
    // 0..N – ignored if null. Includes recipes with at most this many dietary categories.
    const maxDietaryCount = parseOptionalInt(searchParams.get('maxDietaryCount'), 0, 50)
    const maxSubCount = parseOptionalInt(searchParams.get('maxSubCount'), 0, 50)

    // We deliberately keep DB-side filtering to scalar/text columns where PostgREST is reliable.
    // JSONB array `contains`/`eq.[]` filtering is brittle in supabase-js (it serialises
    // arrays as Postgres text arrays), so we fetch candidates and filter in JS.
    async function fetchCandidates(): Promise<FilteredRecipe[]> {
      const out: FilteredRecipe[] = []
      let from = 0
      while (from < MAX_CANDIDATES) {
        let q = supabase
          .from('recipes')
          .select(
            'id, title, slug, imageUrl, mainCategory, subCategories, dietaryCategories, status, updatedAt',
          )
          .order('updatedAt', { ascending: false })
          .range(from, from + CANDIDATE_BATCH - 1)

        if (mainCategories.length > 0) {
          q = q.in('mainCategory', mainCategories)
        }
        if (search.length > 0) {
          const safe = search.replace(/[%,]/g, ' ').trim()
          if (safe.length > 0) {
            q = q.ilike('title', `%${safe}%`)
          }
        }

        const { data, error } = await q
        if (error) {
          throw new Error(error.message || 'Supabase query failed')
        }
        const rows = (data ?? []).map(rowToRecipe)
        out.push(...rows)
        if (rows.length < CANDIDATE_BATCH) break
        from += CANDIDATE_BATCH
      }
      return out
    }

    let candidates: FilteredRecipe[]
    try {
      candidates = await fetchCandidates()
    } catch (err) {
      console.error('❌ Error fetching candidates for tag filter:', err)
      return NextResponse.json(
        {
          error: 'Failed to fetch recipes',
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 },
      )
    }

    const requireMissingMain = missing.includes('mainCategory') || missing.includes('untagged')
    const requireMissingSub = missing.includes('subCategories') || missing.includes('untagged')
    const requireMissingDiet = missing.includes('dietaryCategories') || missing.includes('untagged')

    const filtered = candidates.filter((recipe) => {
      if (dietaryCategories.length > 0 && !hasAllCaseInsensitive(recipe.dietaryCategories, dietaryCategories)) {
        return false
      }
      if (subCategories.length > 0 && !hasAllCaseInsensitive(recipe.subCategories, subCategories)) {
        return false
      }
      if (requireMissingMain && recipe.mainCategory && recipe.mainCategory.trim().length > 0) {
        return false
      }
      if (requireMissingSub && recipe.subCategories.length > 0) {
        return false
      }
      if (requireMissingDiet && recipe.dietaryCategories.length > 0) {
        return false
      }
      if (maxDietaryCount !== null && recipe.dietaryCategories.length > maxDietaryCount) {
        return false
      }
      if (maxSubCount !== null && recipe.subCategories.length > maxSubCount) {
        return false
      }
      return true
    })

    const total = filtered.length
    const paged = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      recipes: paged,
      total,
      limit,
      offset,
      hasMore: offset + paged.length < total,
      candidatesScanned: candidates.length,
      truncated: candidates.length >= MAX_CANDIDATES,
    })
  } catch (error) {
    console.error('❌ Error in /api/admin/tags/recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
