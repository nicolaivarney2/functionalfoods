import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import {
  EXCLUSION_TAGS,
  ORGANIC_TAGS,
  type ExclusionTagId,
} from '@/lib/dietary-exclusions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function safeCount(
  label: string,
  query: PromiseLike<{ count: number | null; error: { message?: string } | null }>
): Promise<number> {
  const { count, error } = await query
  if (error) {
    console.warn(`⚠️ exclusions overview count failed (${label}):`, error.message || error)
    return 0
  }
  return count ?? 0
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()

    const foodTagOrFilter = EXCLUSION_TAGS.map(
      (tag) => `exclusions.cs.["${tag.id}"]`
    ).join(',')

    const [
      totalIngredients,
      ...tagCounts
    ] = await Promise.all([
      safeCount(
        'totalIngredients',
        supabase.from('ingredients').select('*', { count: 'exact', head: true })
      ),
      ...EXCLUSION_TAGS.map((tag) =>
        safeCount(
          `tag:${tag.id}`,
          supabase
            .from('ingredients')
            .select('*', { count: 'exact', head: true })
            .filter('exclusions', 'cs', `["${tag.id}"]`)
        ).then((count) => ({ id: tag.id, count }))
      ),
    ])

    const exclusionCounts = {} as Record<ExclusionTagId, number>
    for (const row of tagCounts) {
      exclusionCounts[row.id as ExclusionTagId] = row.count
    }

    const [foodTaggedCount, anyTaggedCount, totalProducts, organicPriorityCount, organicAnimalCount] =
      await Promise.all([
        safeCount(
          'foodTaggedIngredients',
          supabase
            .from('ingredients')
            .select('*', { count: 'exact', head: true })
            .or(foodTagOrFilter)
        ),
        safeCount(
          'anyTaggedIngredients',
          supabase
            .from('ingredients')
            .select('*', { count: 'exact', head: true })
            .not('exclusions', 'eq', '[]')
            .not('exclusions', 'is', null)
        ),
        safeCount('totalProducts', supabase.from('products').select('*', { count: 'exact', head: true })),
        safeCount(
          'organicPriority',
          supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .contains('organic_tags', ['organic-priority'])
        ),
        safeCount(
          'organicAnimal',
          supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .contains('organic_tags', ['organic-animal'])
        ),
      ])

    const total = totalIngredients

    return NextResponse.json({
      success: true,
      exclusionTags: EXCLUSION_TAGS.map((tag) => ({
        ...tag,
        ingredientCount: exclusionCounts[tag.id] ?? 0,
      })),
      organicProductStats: ORGANIC_TAGS.map((tag) => ({
        id: tag.id,
        label: tag.label,
        description: tag.description,
        productCount:
          tag.id === 'organic-priority'
            ? (organicPriorityCount ?? 0)
            : (organicAnimalCount ?? 0),
      })),
      organicTags: ORGANIC_TAGS.map((tag) => ({
        ...tag,
        ingredientCount: 0,
        productCount:
          tag.id === 'organic-priority'
            ? (organicPriorityCount ?? 0)
            : (organicAnimalCount ?? 0),
      })),
      productStats: {
        totalProducts: totalProducts ?? 0,
        organicPriority: organicPriorityCount ?? 0,
        organicAnimal: organicAnimalCount ?? 0,
      },
      stats: {
        totalIngredients: total,
        foodTaggedIngredients: foodTaggedCount,
        anyTaggedIngredients: anyTaggedCount,
        untaggedIngredients: Math.max(0, total - anyTaggedCount),
        coveragePercent: total > 0 ? Math.round((anyTaggedCount / total) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('❌ GET /api/admin/exclusions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load tag overview',
      },
      { status: 500 }
    )
  }
}
