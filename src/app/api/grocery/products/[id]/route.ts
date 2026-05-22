import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { mapProduct, PRODUCT_SELECT, type RawProduct } from '@/grocery/api/mappers'
import { notFound, serverError, singleResponse } from '@/grocery/api/responses'
import { getGroceryServiceClient } from '@/grocery/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/grocery/products/[id]
 *
 * Returns a single product (by UUID) with all its offers.
 * Also accepts a GTIN — if `id` is a 13-digit number, looks up by gtin instead.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireApiKey(request)
  if (unauthorized) return unauthorized

  const { id } = await context.params
  const supabase = getGroceryServiceClient()

  const isLikelyGtin = /^\d{8,14}$/.test(id)

  let query = supabase.from('products').select(PRODUCT_SELECT).eq('active', true)
  query = isLikelyGtin ? query.eq('gtin', id).limit(1) : query.eq('id', id).limit(1)

  const { data, error } = await query.maybeSingle()
  if (error) return serverError('Database query failed', error.message)
  if (!data) return notFound('Product not found')

  return singleResponse(mapProduct(data as unknown as RawProduct))
}
