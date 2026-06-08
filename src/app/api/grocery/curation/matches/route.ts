import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { mapMatch } from '@/grocery/api/curation-mappers'
import { badRequest, listResponse, serverError } from '@/grocery/api/responses'
import { getGroceryServiceClient } from '@/grocery/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

/**
 * GET /api/grocery/curation/matches
 *
 * Query params:
 *   productExternalId — filter by product (e.g. bilka-110606)
 *   ingredientId      — filter by ingredient
 *   source            — planomo | ff
 *   since             — ISO timestamp, only rows synced after
 *   limit / offset    — pagination
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireApiKey(request, 'read:curation')
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const productExternalId = searchParams.get('productExternalId') ?? undefined
  const ingredientId = searchParams.get('ingredientId') ?? undefined
  const source = searchParams.get('source') ?? undefined
  const since = searchParams.get('since') ?? undefined

  if (source && source !== 'planomo' && source !== 'ff') {
    return badRequest('source must be planomo or ff')
  }

  const limitRaw = Number.parseInt(searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10)
  const offsetRaw = Number.parseInt(searchParams.get('offset') ?? '0', 10)
  if (Number.isNaN(limitRaw) || limitRaw < 1) return badRequest('limit must be >= 1')
  if (Number.isNaN(offsetRaw) || offsetRaw < 0) return badRequest('offset must be >= 0')
  const limit = Math.min(MAX_LIMIT, limitRaw)
  const offset = offsetRaw

  const supabase = getGroceryServiceClient()
  let query = supabase
    .from('product_ingredient_matches')
    .select(
      `
        ingredient_id,
        product_external_id,
        confidence,
        is_manual,
        match_type,
        product_name_snapshot,
        product_store_snapshot,
        last_known_price,
        source,
        synced_at
      `,
      { count: 'exact' },
    )
    .order('synced_at', { ascending: false })

  if (productExternalId) query = query.eq('product_external_id', productExternalId)
  if (ingredientId) query = query.eq('ingredient_id', ingredientId)
  if (source) query = query.eq('source', source)
  if (since) query = query.gte('synced_at', since)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return serverError('Matches query failed', error.message)

  return listResponse((data ?? []).map(mapMatch), { total: count ?? 0, limit, offset })
}
