import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

const SIMILAR_PRODUCTS_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=3600'
const SIMILAR_PRODUCTS_MEMORY_TTL_MS = 10 * 60 * 1000
const SIMILAR_PRODUCTS_MEMORY_MAX_ITEMS = 500

type SimilarProductsResponse = {
  success: true
  products: any[]
  total: number
}

const similarProductsCache = new Map<
  string,
  { expiresAt: number; payload: SimilarProductsResponse }
>()

function pruneSimilarProductsCache() {
  if (similarProductsCache.size <= SIMILAR_PRODUCTS_MEMORY_MAX_ITEMS) return
  const now = Date.now()
  for (const [key, entry] of similarProductsCache.entries()) {
    if (entry.expiresAt <= now) {
      similarProductsCache.delete(key)
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productName = searchParams.get('name')
    const excludeStore = searchParams.get('excludeStore')

    if (!productName) {
      return NextResponse.json(
        { success: false, message: 'Product name is required' },
        { status: 400 }
      )
    }

    const cacheKey = `${productName.toLowerCase().trim()}::${(excludeStore || '').toLowerCase().trim()}`
    const cached = similarProductsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, {
        headers: {
          'Cache-Control': SIMILAR_PRODUCTS_CACHE_CONTROL,
        },
      })
    }

    const similarProducts = await databaseService.getSimilarProductsAcrossStores(
      productName, 
      excludeStore || undefined
    )

    const payload: SimilarProductsResponse = {
      success: true,
      products: similarProducts,
      total: similarProducts.length
    }

    pruneSimilarProductsCache()
    similarProductsCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + SIMILAR_PRODUCTS_MEMORY_TTL_MS,
    })

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': SIMILAR_PRODUCTS_CACHE_CONTROL,
      },
    })

  } catch (error: any) {
    console.error('❌ Error fetching similar products:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
