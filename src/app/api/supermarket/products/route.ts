import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export const maxDuration = 60

const MAX_PAGE = 10_000
const MAX_LIMIT = 100
const MAX_FILTER_VALUES = 20
const MAX_SEARCH_LENGTH = 120

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function parseListParam(value: string | null): string[] | undefined {
  if (!value) return undefined
  const items = value
    .split(',')
    .map((part) => decodeURIComponent(part.trim()))
    .filter((part) => part.length > 0)
    .slice(0, MAX_FILTER_VALUES)
  return items.length > 0 ? items : undefined
}

function buildCacheControl({
  countsOnly,
  hasSearch,
  allowCountsCache,
}: {
  countsOnly: boolean
  hasSearch: boolean
  allowCountsCache?: boolean
}): string {
  if (countsOnly) {
    // Cache counts at edge when non-zero — cold DB path is ~3–8s; stale 10 min is OK for sidebar.
    if (allowCountsCache) {
      return 'public, s-maxage=600, stale-while-revalidate=3600'
    }
    return 'private, no-cache, no-store, must-revalidate'
  }
  if (hasSearch) {
    // Search responses vary more; keep shorter CDN cache.
    return 'public, s-maxage=120, stale-while-revalidate=600'
  }
  // Listing/filter responses are hot paths on dagligvarer.
  return 'public, s-maxage=900, stale-while-revalidate=43200'
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseBoundedInt(searchParams.get('page'), 1, 1, MAX_PAGE)
    const limit = parseBoundedInt(searchParams.get('limit'), MAX_LIMIT, 1, MAX_LIMIT)
    
    // Decode category parameters (they may be URL-encoded)
    const categoryParam = searchParams.get('category')
    const category = categoryParam ? decodeURIComponent(categoryParam) : undefined // Legacy support
    
    const categories = parseListParam(searchParams.get('categories'))
    
    const stores = parseListParam(searchParams.get('stores'))
    const offers = searchParams.get('offers') === 'true'
    const rawSearch = searchParams.get('search')
      ? decodeURIComponent(searchParams.get('search') || '')
      : undefined
    const search = rawSearch ? rawSearch.trim().slice(0, MAX_SEARCH_LENGTH) : undefined
    const countsOnly = searchParams.get('counts') === 'true'
    const foodOnly = searchParams.get('foodOnly') !== 'false'
    const organic = searchParams.get('organic') === 'true'
    
    
    // If only counts are requested, return optimized count data
    if (countsOnly) {
      const counts = await databaseService.getProductCountsV2(foodOnly)
      const hasUsableCounts = counts.total > 0 || counts.offers > 0
      return NextResponse.json({
        success: true,
        counts: counts,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Cache-Control': buildCacheControl({
            countsOnly: true,
            hasSearch: false,
            allowCountsCache: hasUsableCounts,
          }),
        },
      })
    }
    
    // Get products from new global structure
    const finalCategory = categories?.length ? categories : (category ? [category] : undefined)
    
    const result = await databaseService.getSupermarketProductsV2(page, limit, finalCategory, offers, search, stores, foodOnly, organic)

    // Cache aldrig et tomt resultat — en transient timeout må ikke "fryses" i CDN i 15 min.
    const cacheControl =
      result.products.length === 0
        ? 'private, no-cache, no-store, must-revalidate'
        : buildCacheControl({ countsOnly: false, hasSearch: Boolean(search && search.trim()) })

    return NextResponse.json({
      success: true,
      products: result.products,
      count: result.total,
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore: result.hasMore
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': cacheControl,
      },
    })
    
  } catch (error) {
    console.error('❌ [API] Error fetching supermarket products:', error)
    
    // Log full error details for Vercel debugging
    if (error instanceof Error) {
      console.error(`❌ [API] Error message: ${error.message}`)
      console.error(`❌ [API] Error stack: ${error.stack}`)
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch supermarket products',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
