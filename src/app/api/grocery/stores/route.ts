import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { serverError } from '@/grocery/api/responses'
import type { GroceryStoreDto } from '@/grocery/api/shapes'
import { getGroceryServiceClient } from '@/grocery/db/client'
import {
  CHAIN_COVERAGE,
  COVERAGE_LABEL,
  type CatalogCoverage,
  type SourceChain,
} from '@/grocery/types'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/grocery/stores
 *
 * Lists grocery chains with data-coverage metadata.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireApiKey(request, 'read:catalog')
  if (unauthorized) return unauthorized

  const supabase = getGroceryServiceClient()
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, type')
    .eq('type', 'chain')
    .order('name')

  if (error) return serverError('Stores query failed', error.message)

  const stores: GroceryStoreDto[] = (data ?? []).map((row) => {
    const coverage = (CHAIN_COVERAGE[row.id as SourceChain] ?? 'none') as CatalogCoverage
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      coverage,
      coverageLabel: COVERAGE_LABEL[coverage],
    }
  })

  return NextResponse.json(
    { data: stores, meta: { total: stores.length } },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  )
}
