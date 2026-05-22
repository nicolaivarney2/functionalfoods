import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { mapProduct, PRODUCT_SELECT, type RawProduct } from '@/grocery/api/mappers'
import { badRequest, listResponse, serverError } from '@/grocery/api/responses'
import { getGroceryServiceClient } from '@/grocery/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50
const ALLOWED_ORDER = new Set(['name', 'price_asc', 'price_desc', 'recent'])

/**
 * GET /api/grocery/products
 *
 * Query params:
 *   chain         — filter by source_chain (netto, bilka, foetex, ...)
 *   category      — filter by category_lvl0
 *   q             — name ILIKE search (use /search for ranked full-text)
 *   gtin          — exact GTIN match
 *   onSale        — 'true' to only return on-sale items
 *   limit         — default 50, max 200
 *   offset        — default 0
 *   orderBy       — name | price_asc | price_desc | recent
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireApiKey(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)

  const chain = searchParams.get('chain') ?? undefined
  const category = searchParams.get('category') ?? undefined
  const q = searchParams.get('q')?.trim() ?? undefined
  const gtin = searchParams.get('gtin') ?? undefined
  const onSale = searchParams.get('onSale') === 'true'

  const orderBy = searchParams.get('orderBy') ?? 'name'
  if (!ALLOWED_ORDER.has(orderBy)) {
    return badRequest(`orderBy must be one of ${[...ALLOWED_ORDER].join(', ')}`)
  }

  const limitRaw = Number.parseInt(searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10)
  const offsetRaw = Number.parseInt(searchParams.get('offset') ?? '0', 10)
  if (Number.isNaN(limitRaw) || limitRaw < 1) return badRequest('limit must be >= 1')
  if (Number.isNaN(offsetRaw) || offsetRaw < 0) return badRequest('offset must be >= 0')
  const limit = Math.min(MAX_LIMIT, limitRaw)
  const offset = offsetRaw

  const supabase = getGroceryServiceClient()

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('active', true)
    .not('name', 'eq', '') // skip Algolia phantom rows

  if (chain) query = query.eq('source_chain', chain)
  if (category) query = query.eq('category_lvl0', category)
  if (gtin) query = query.eq('gtin', gtin)
  if (q) query = query.ilike('name', `%${q}%`)
  if (onSale) query = query.eq('product_offers.is_on_sale', true)

  if (orderBy === 'name') query = query.order('name', { ascending: true })
  else if (orderBy === 'recent') query = query.order('last_seen_at', { ascending: false })
  // price-based ordering requires a join sort; fall back to name for now
  else query = query.order('name', { ascending: true })

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return serverError('Database query failed', error.message)

  const rows = (data ?? []) as unknown as RawProduct[]
  return listResponse(rows.map(mapProduct), { total: count ?? 0, limit, offset })
}
