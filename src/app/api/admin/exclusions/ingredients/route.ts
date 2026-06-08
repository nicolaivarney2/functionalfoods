import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import {
  EXCLUSION_TAG_IDS,
  ORGANIC_TAG_IDS,
  mergeIngredientTags,
  normalizeExclusionTags,
  normalizeOrganicTags,
  parseIngredientTags,
  suggestExclusionTagsFromName,
  suggestOrganicTagsFromNameAndCategory,
  type ExclusionTagId,
  type OrganicTagId,
} from '@/lib/dietary-exclusions'
import { runFooddataPublish, upsertIngredientTagsInFooddata } from '@/lib/fooddata-publish'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type TagFilter = ExclusionTagId | OrganicTagId | 'untagged' | 'untagged-food' | null

function parseTagFilter(raw: string | null): TagFilter {
  if (!raw || raw === 'all') return null
  if (raw === 'untagged') return 'untagged'
  if (raw === 'untagged-food') return 'untagged-food'
  if (EXCLUSION_TAG_IDS.includes(raw as ExclusionTagId)) return raw as ExclusionTagId
  if (ORGANIC_TAG_IDS.has(raw as OrganicTagId)) return raw as OrganicTagId
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const search = (searchParams.get('search') || '').trim()
    const tagFilter = parseTagFilter(searchParams.get('tag'))
    const offset = (page - 1) * limit

    const supabase = createSupabaseServiceClient()

    let query = supabase
      .from('ingredients')
      .select('id, name, category, exclusions', { count: 'exact' })
      .order('name')

    if (search.length >= 2) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: allRows, error, count } = await query.range(0, 9999)
    if (error) throw new Error(error.message)

    let filtered = (allRows || []).map((row) => {
      const parsed = parseIngredientTags(row.exclusions)
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        foodExclusions: parsed.foodExclusions,
        organicTags: parsed.organicTags,
        suggestedFoodTags: suggestExclusionTagsFromName(row.name),
        suggestedOrganicTags: suggestOrganicTagsFromNameAndCategory(row.name, row.category),
      }
    })

    if (tagFilter === 'untagged') {
      filtered = filtered.filter(
        (row) => row.foodExclusions.length === 0 && row.organicTags.length === 0
      )
    } else if (tagFilter === 'untagged-food') {
      filtered = filtered.filter((row) => row.foodExclusions.length === 0)
    } else if (tagFilter && ORGANIC_TAG_IDS.has(tagFilter as OrganicTagId)) {
      filtered = filtered.filter((row) => row.organicTags.includes(tagFilter as OrganicTagId))
    } else if (tagFilter) {
      filtered = filtered.filter((row) => row.foodExclusions.includes(tagFilter as ExclusionTagId))
    }

    const total = filtered.length
    const pageRows = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      ingredients: pageRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      dbTotal: count ?? filtered.length,
    })
  } catch (error) {
    console.error('❌ GET /api/admin/exclusions/ingredients:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load ingredients',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const ingredientIds: string[] = Array.isArray(body.ingredientIds)
      ? body.ingredientIds.filter((id: unknown) => typeof id === 'string' && id.length > 0)
      : []

    if (ingredientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ingredientIds array is required' },
        { status: 400 }
      )
    }

    const hasFoodPatch =
      body.setFoodTags !== undefined ||
      body.addFoodTags !== undefined ||
      body.removeFoodTags !== undefined
    const hasOrganicPatch =
      body.setOrganicTags !== undefined ||
      body.addOrganicTags !== undefined ||
      body.removeOrganicTags !== undefined

    if (!hasFoodPatch && !hasOrganicPatch) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Provide setFoodTags/addFoodTags/removeFoodTags and/or setOrganicTags/addOrganicTags/removeOrganicTags',
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()

    const { data: existing, error: fetchError } = await supabase
      .from('ingredients')
      .select('id, exclusions')
      .in('id', ingredientIds)

    if (fetchError) throw new Error(fetchError.message)

    let updated = 0
    const fooddataFailures: string[] = []
    for (const row of existing || []) {
      const next = mergeIngredientTags(row.exclusions, {
        setFoodExclusions:
          body.setFoodTags !== undefined
            ? normalizeExclusionTags(body.setFoodTags)
            : undefined,
        setOrganicTags:
          body.setOrganicTags !== undefined
            ? normalizeOrganicTags(body.setOrganicTags)
            : undefined,
        addFood: normalizeExclusionTags(body.addFoodTags),
        removeFood: normalizeExclusionTags(body.removeFoodTags),
        addOrganic: normalizeOrganicTags(body.addOrganicTags),
        removeOrganic: normalizeOrganicTags(body.removeOrganicTags),
      })

      const { error } = await supabase
        .from('ingredients')
        .update({ exclusions: next })
        .eq('id', row.id)

      if (error) {
        console.error(`❌ Failed to update ${row.id}:`, error.message)
        continue
      }
      updated++

      const fooddataSync = await runFooddataPublish(
        `ingredient-tags:${row.id}`,
        (client) => upsertIngredientTagsInFooddata(client, row.id, next)
      )
      if (!fooddataSync.ok && !fooddataSync.skipped) {
        fooddataFailures.push(row.id)
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      requested: ingredientIds.length,
      fooddataSync: {
        ok: fooddataFailures.length === 0,
        failedIngredientIds: fooddataFailures,
      },
    })
  } catch (error) {
    console.error('❌ PATCH /api/admin/exclusions/ingredients:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tags',
      },
      { status: 500 }
    )
  }
}
