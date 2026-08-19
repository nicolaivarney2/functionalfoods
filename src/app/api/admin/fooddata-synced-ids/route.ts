import { NextResponse } from 'next/server'
import { loadFooddataSyncedIdsCached } from '@/lib/fooddata-curation/fooddata-ids'
import {
  getFooddataPublishClient,
  isFooddataPublishConfigured,
} from '@/lib/fooddata-publish/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/fooddata-synced-ids
 *
 * ingredientIds = kun source=planomo (FF-ingredienser med delvise matches vises stadig).
 * productIds = alle matchede varer i fooddata (bruges af nye-varer-køen).
 */
export async function GET() {
  try {
    if (!isFooddataPublishConfigured()) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          ingredientIds: [] as string[],
          productIds: [] as string[],
        },
      })
    }

    const synced = await loadFooddataSyncedIdsCached(getFooddataPublishClient())

    return NextResponse.json({
      success: true,
      data: {
        available: true,
        ingredientIds: Array.from(synced.ingredientIds),
        productIds: Array.from(synced.productIds),
      },
    })
  } catch (error) {
    console.error('❌ fooddata-synced-ids GET:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
