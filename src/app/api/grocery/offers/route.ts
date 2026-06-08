import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { mapProduct, PRODUCT_SELECT, type RawProduct } from '@/grocery/api/mappers'
import { badRequest, listResponse, serverError } from '@/grocery/api/responses'
import { getGroceryServiceClient } from '@/grocery/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

/**
 * GET /api/grocery/offers
 *
 * Only returns products with at least one offer where `is_on_sale = true`.
 * Same filter shape as /products but the on-sale predicate is mandatory.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireApiKey(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const chain = searchParams.get('chain') ?? undefined
  const category = searchParams.get('category') ?? undefined

  const limitRaw = Number.parseInt(searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10)
  const offsetRaw = Number.parseInt(searchParams.get('offset') ?? '0', 10)
  if (Number.isNaN(limitRaw) || limitRaw < 1) return badRequest('limit must be >= 1')
  if (Number.isNaN(offsetRaw) || offsetRaw < 0) return badRequest('offset must be >= 0')
  const limit = Math.min(MAX_LIMIT, limitRaw)
  const offset = offsetRaw

  const supabase = getGroceryServiceClient()

  // Drive the query from product_offers so the join filter actually narrows.
  // We embed products(...) with !inner so only rows with offers come back.
  let q = supabase
    .from('product_offers')
    .select(
      `
        store_id,
        price_cents,
        before_price_cents,
        unit_price_cents,
        unit_price_unit,
        is_on_sale,
        in_stock,
        offer_from,
        offer_until,
        offer_description,
        multibuy,
        discount_percentage,
        products!inner (${PRODUCT_SELECT})
      `,
      { count: 'exact' },
    )
    .eq('is_on_sale', true)

  if (chain) q = q.eq('store_id', chain)
  if (category) q = q.eq('products.category_lvl0', category)
  q = q.not('products.name', 'eq', '')

  q = q.order('discount_percentage', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) return serverError('Offers query failed', error.message)

  // Reshape: the row IS the offer, with .products embedded.
  // We return products with their offers attached.
  const result = (data ?? []).map((row) => {
    const product = (row as unknown as { products: RawProduct }).products
    return mapProduct(product)
  })

  return listResponse(result, { total: count ?? 0, limit, offset })
}
