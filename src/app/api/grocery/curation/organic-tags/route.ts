import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { mapOrganicTags } from '@/grocery/api/curation-mappers'
import { badRequest, listResponse, serverError } from '@/grocery/api/responses'
import { getGroceryServiceClient } from '@/grocery/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

/**
 * GET /api/grocery/curation/organic-tags
 *
 * Query params:
 *   productExternalId — single product
 *   since             — ISO timestamp
 *   limit / offset
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireApiKey(request, 'read:curation')
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const productExternalId = searchParams.get('productExternalId') ?? undefined
  const since = searchParams.get('since') ?? undefined

  const limitRaw = Number.parseInt(searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10)
  const offsetRaw = Number.parseInt(searchParams.get('offset') ?? '0', 10)
  if (Number.isNaN(limitRaw) || limitRaw < 1) return badRequest('limit must be >= 1')
  if (Number.isNaN(offsetRaw) || offsetRaw < 0) return badRequest('offset must be >= 0')
  const limit = Math.min(MAX_LIMIT, limitRaw)
  const offset = offsetRaw

  const supabase = getGroceryServiceClient()
  let query = supabase
    .from('product_organic_tags')
    .select('product_external_id, organic_tags, source, synced_at, updated_at', { count: 'exact' })
    .order('synced_at', { ascending: false })

  if (productExternalId) query = query.eq('product_external_id', productExternalId)
  if (since) query = query.gte('synced_at', since)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return serverError('Organic tags query failed', error.message)

  return listResponse((data ?? []).map(mapOrganicTags), { total: count ?? 0, limit, offset })
}
