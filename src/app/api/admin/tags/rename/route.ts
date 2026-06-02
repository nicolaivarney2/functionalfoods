import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { databaseService } from '@/lib/database-service'
import { revalidateRecipeCollectionPaths } from '@/lib/cache-revalidation'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Field = 'mainCategory' | 'subCategories' | 'dietaryCategories'

interface RenameRequest {
  field: Field
  // Tag value to look for (case-insensitive match).
  from: string
  // Replacement value. Empty string or null = delete the tag without replacement.
  to?: string | null
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as RenameRequest
    if (!body || typeof body.from !== 'string' || body.from.trim().length === 0) {
      return NextResponse.json({ error: 'from is required' }, { status: 400 })
    }
    if (body.field !== 'mainCategory' && body.field !== 'subCategories' && body.field !== 'dietaryCategories') {
      return NextResponse.json({ error: 'field must be mainCategory, subCategories or dietaryCategories' }, { status: 400 })
    }

    const fromValue = body.from.trim()
    const fromLower = fromValue.toLowerCase()
    const toRaw = typeof body.to === 'string' ? body.to.trim() : ''
    const toValue = toRaw.length > 0 ? toRaw : null

    const updatedAt = new Date().toISOString()

    if (body.field === 'mainCategory') {
      // Single string column. Match case-insensitively.
      const { data: matches, error: fetchError } = await supabase
        .from('recipes')
        .select('id, slug, mainCategory, dietaryCategories')
        .ilike('mainCategory', fromValue)

      if (fetchError) {
        console.error('❌ Error fetching recipes for rename mainCategory:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
      }

      if (!matches || matches.length === 0) {
        return NextResponse.json({ success: true, updatedCount: 0, field: body.field })
      }

      const ids = matches.map((m: any) => m.id)
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ mainCategory: toValue, updatedAt })
        .in('id', ids)

      if (updateError) {
        console.error('❌ Error renaming mainCategory:', updateError)
        return NextResponse.json({ error: 'Failed to rename tag', details: updateError.message }, { status: 500 })
      }

      databaseService.clearRecipeCaches()
      for (const recipe of matches) {
        if (typeof recipe?.slug === 'string') revalidatePath(`/opskrift/${recipe.slug}`)
        revalidateRecipeCollectionPaths(recipe || {})
      }

      return NextResponse.json({ success: true, updatedCount: matches.length, field: body.field })
    }

    // Array field branch – we need to rewrite each row.
    // Use `contains` with case-sensitive value first to short-list; then in JS handle case-insensitive matching for messy data.
    // To be robust against case differences we instead pull a wider slice and filter in JS.
    // For typical scales (≤ low thousands of recipes) this remains cheap.
    const field = body.field
    const { data: allRows, error: fetchError } = await supabase
      .from('recipes')
      .select(`id, slug, mainCategory, ${field}`)

    if (fetchError) {
      console.error('❌ Error fetching recipes for array rename:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }

    let updatedCount = 0
    const affected: Array<{ slug?: string | null; mainCategory?: string | null; dietaryCategories?: unknown }> = []

    for (const row of allRows ?? []) {
      const current: string[] = Array.isArray((row as any)?.[field])
        ? ((row as any)[field] as unknown[]).filter((v): v is string => typeof v === 'string')
        : []
      if (current.length === 0) continue

      const containsFrom = current.some((v) => v.trim().toLowerCase() === fromLower)
      if (!containsFrom) continue

      // Build the new array.
      const seen = new Set<string>()
      const next: string[] = []

      for (const value of current) {
        const lower = value.trim().toLowerCase()
        const isMatch = lower === fromLower
        const candidate = isMatch ? toValue : value
        if (!candidate) continue
        const key = candidate.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        next.push(candidate)
      }

      // If nothing actually changed (e.g. case-only no-op AND value identical), skip.
      const before = JSON.stringify(current)
      const after = JSON.stringify(next)
      if (before === after) continue

      if (next.length < current.length) {
        await supabase.from('recipes').update({ [field]: null }).eq('id', (row as any).id)
        await new Promise((resolve) => setTimeout(resolve, 25))
      }

      const { error: updateError } = await supabase
        .from('recipes')
        .update({ [field]: next, updatedAt })
        .eq('id', (row as any).id)

      if (updateError) {
        console.error(`❌ Failed updating recipe ${(row as any).id}:`, updateError)
        continue
      }

      updatedCount += 1
      affected.push({
        slug: (row as any).slug,
        mainCategory: (row as any).mainCategory ?? null,
        dietaryCategories: field === 'dietaryCategories' ? next : (row as any).dietaryCategories,
      })
    }

    databaseService.clearRecipeCaches()
    for (const recipe of affected) {
      if (typeof recipe.slug === 'string') revalidatePath(`/opskrift/${recipe.slug}`)
      revalidateRecipeCollectionPaths(recipe)
    }

    return NextResponse.json({ success: true, updatedCount, field: body.field })
  } catch (error) {
    console.error('❌ Error in /api/admin/tags/rename:', error)
    return NextResponse.json({ error: 'Failed to rename tag' }, { status: 500 })
  }
}
