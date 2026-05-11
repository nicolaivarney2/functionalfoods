import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Result of a cleanup pass on product_offers.
 */
export type ExpiredOffersCleanupResult = {
  cleaned: number
  totalFound: number
  byStore: Record<string, number>
  sample: Array<{
    name: string | null
    expired_date: string | null
    store: string | null
  }>
  durationMs: number
}

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }
  return createClient(url, serviceKey)
}

/**
 * Deactivate all product_offers whose sale_valid_to is in the past but
 * are still flagged as on-sale / active. Runs in batches to handle the
 * Supabase 1000-row limit.
 *
 * Sets:
 *   - is_on_sale = false
 *   - is_offer_active = false
 *   - discount_percentage = null
 *   - updated_at = now()
 *
 * Safe to run frequently. Idempotent.
 */
export async function cleanupExpiredOffers(options?: {
  supabase?: SupabaseClient
  /** Cap on rows scanned to avoid runaway loops. Defaults to 50k. */
  maxRows?: number
}): Promise<ExpiredOffersCleanupResult> {
  const supabase = options?.supabase ?? getAdminClient()
  const maxRows = options?.maxRows ?? 50_000
  const startedAt = Date.now()
  const nowIso = new Date().toISOString()

  const BATCH_SIZE = 1000
  const allExpired: Array<{ id: string; name_store: string | null; sale_valid_to: string | null; store_id: string | null }> = []
  let offset = 0

  while (allExpired.length < maxRows) {
    const remaining = maxRows - allExpired.length
    const take = Math.min(BATCH_SIZE, remaining)

    const { data: batch, error } = await supabase
      .from('product_offers')
      .select('id, name_store, sale_valid_to, store_id')
      .or('is_on_sale.eq.true,is_offer_active.eq.true')
      .not('sale_valid_to', 'is', null)
      .lt('sale_valid_to', nowIso)
      .order('sale_valid_to', { ascending: true })
      .range(offset, offset + take - 1)

    if (error) {
      throw new Error(`Failed to fetch expired offers: ${error.message}`)
    }

    if (!batch || batch.length === 0) break

    allExpired.push(...batch)

    if (batch.length < take) break
    offset += take
  }

  let cleaned = 0
  for (let i = 0; i < allExpired.length; i += BATCH_SIZE) {
    const slice = allExpired.slice(i, i + BATCH_SIZE)
    const ids = slice.map((o) => o.id)

    const { error: updateError } = await supabase
      .from('product_offers')
      .update({
        is_on_sale: false,
        is_offer_active: false,
        discount_percentage: null,
        updated_at: nowIso,
      })
      .in('id', ids)

    if (updateError) {
      throw new Error(`Failed to deactivate expired offers: ${updateError.message}`)
    }

    cleaned += slice.length
  }

  const byStore = allExpired.reduce<Record<string, number>>((acc, offer) => {
    const store = offer.store_id || 'unknown'
    acc[store] = (acc[store] || 0) + 1
    return acc
  }, {})

  return {
    cleaned,
    totalFound: allExpired.length,
    byStore,
    sample: allExpired.slice(0, 10).map((o) => ({
      name: o.name_store,
      expired_date: o.sale_valid_to,
      store: o.store_id,
    })),
    durationMs: Date.now() - startedAt,
  }
}
