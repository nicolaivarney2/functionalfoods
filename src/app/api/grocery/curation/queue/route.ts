import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { mapQueueItem } from '@/grocery/api/curation-mappers'
import { badRequest, listResponse, serverError } from '@/grocery/api/responses'
import { getGroceryServiceClient } from '@/grocery/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

/**
 * GET /api/grocery/curation/queue
 *
 * Query params:
 *   status  — pending (default) | matched | dismissed
 *   source  — planomo | ff
 *   storeId — filter by store
 *   since   — ISO timestamp
 *   limit / offset
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireApiKey(request, 'read:curation')
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'pending'
  const source = searchParams.get('source') ?? undefined
  const storeId = searchParams.get('storeId') ?? undefined
  const since = searchParams.get('since') ?? undefined

  if (!['pending', 'matched', 'dismissed'].includes(status)) {
    return badRequest('status must be pending, matched, or dismissed')
  }
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
    .from('product_ingredient_match_queue')
    .select(
      `
        product_id,
        store_product_id,
        store_id,
        product_name_snapshot,
        status,
        queued_at,
        resolved_at,
        source,
        synced_at
      `,
      { count: 'exact' },
    )
    .eq('status', status)
    .order('queued_at', { ascending: false })

  if (source) query = query.eq('source', source)
  if (storeId) query = query.eq('store_id', storeId)
  if (since) query = query.gte('synced_at', since)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return serverError('Queue query failed', error.message)

  return listResponse((data ?? []).map(mapQueueItem), { total: count ?? 0, limit, offset })
}
