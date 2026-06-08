import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { mapProduct, PRODUCT_SELECT, type RawProduct } from '@/grocery/api/mappers'
import { badRequest, listResponse, serverError } from '@/grocery/api/responses'
import { getGroceryServiceClient } from '@/grocery/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100

/**
 * GET /api/grocery/search
 *
 * Query params:
 *   q       — search query (required). Matches name (ILIKE) and gtin (exact).
 *   chain   — optional source_chain filter
 *   limit   — default 25, max 100
 *
 * Uses pg_trgm GIN index on `products.name` for fast partial matching.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireApiKey(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return badRequest('q parameter must be at least 2 characters')
  }

  const chain = searchParams.get('chain') ?? undefined
  const limit = Math.min(MAX_LIMIT, Number.parseInt(searchParams.get('limit') ?? '25', 10) || 25)

  const supabase = getGroceryServiceClient()

  // GTIN exact match if numeric — useful for barcode scans
  if (/^\d{8,14}$/.test(q)) {
    let g = supabase.from('products').select(PRODUCT_SELECT).eq('gtin', q).eq('active', true)
    if (chain) g = g.eq('source_chain', chain)
    g = g.limit(limit)
    const { data, error } = await g
    if (error) return serverError('Search failed', error.message)
    const rows = (data ?? []) as unknown as RawProduct[]
    return listResponse(rows.map(mapProduct), { total: rows.length, limit, offset: 0 })
  }

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('active', true)
    .not('name', 'eq', '')
    .ilike('name', `%${q}%`)

  if (chain) query = query.eq('source_chain', chain)
  query = query.order('name', { ascending: true }).limit(limit)

  const { data, error, count } = await query
  if (error) return serverError('Search failed', error.message)

  const rows = (data ?? []) as unknown as RawProduct[]
  return listResponse(rows.map(mapProduct), { total: count ?? 0, limit, offset: 0 })
}
