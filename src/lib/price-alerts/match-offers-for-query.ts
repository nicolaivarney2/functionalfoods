import { createSupabaseServiceClient } from '@/lib/supabase'
import { MAX_GROUP_ALERTS } from './constants'
import {
  buildSearchVariants,
  nameMatchesAllTokens,
  normalizeForSearch,
  scoreOfferRelevance,
} from './helpers'
import { normalizeDagligvarerStoreIds } from './store-ids'

export type PriceAlertOfferMatch = {
  productOfferId: number
  productId: string
  storeId: string
  name: string
  imageUrl: string | null
  currentPrice: number | null
  isOnSale: boolean
  score: number
}

const PER_STORE_LIMIT = 120

const offerSelect = `
  id,
  product_id,
  store_id,
  name_store,
  current_price,
  is_on_sale,
  is_available,
  products:product_id (
    name_generic,
    image_url
  )
`

function buildOrQuery(fields: string[], terms: string[]): string {
  return fields.flatMap((field) => terms.map((t) => `${field}.ilike.%${t}%`)).join(',')
}

function mapOfferRow(row: Record<string, unknown>, searchQuery: string, tokens: string[]): PriceAlertOfferMatch | null {
  const productsArr = Array.isArray(row.products) ? row.products : row.products ? [row.products] : []
  const product = (productsArr[0] || {}) as Record<string, unknown>
  const name = String(row.name_store || product.name_generic || '').trim()
  if (!name || !nameMatchesAllTokens(name, tokens)) return null

  const score = scoreOfferRelevance(name, searchQuery, tokens)
  const imageUrl = typeof product.image_url === 'string' ? product.image_url : null

  return {
    productOfferId: Number(row.id),
    productId: String(row.product_id),
    storeId: String(row.store_id),
    name,
    imageUrl,
    currentPrice: row.current_price != null ? Number(row.current_price) : null,
    isOnSale: Boolean(row.is_on_sale),
    score,
  }
}

/**
 * Søger product_offers + products ved oprettelse/preview — ikke i cron.
 * Per-butik cap så én kæde ikke fylder hele limit.
 */
export async function matchOffersForPriceAlertQuery(
  searchQuery: string,
  storeIds?: string[] | null,
): Promise<PriceAlertOfferMatch[]> {
  const trimmed = searchQuery.trim()
  if (trimmed.length < 2) return []

  const tokens = normalizeForSearch(trimmed)
    .split(' ')
    .filter((t) => t.length >= 2)
  if (tokens.length === 0) return []

  const stores = normalizeDagligvarerStoreIds(storeIds)
  const phraseVariants = Array.from(
    new Set(
      buildSearchVariants(trimmed)
        .map((t) => t.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim())
        .filter((t) => t.length >= 2),
    ),
  )
  const nameOrQuery = buildOrQuery(['name_store'], phraseVariants)
  const productsOrQuery = buildOrQuery(['name_generic'], phraseVariants)

  const supabase = createSupabaseServiceClient()
  const byKey = new Map<string, PriceAlertOfferMatch>()

  const fetchStoreOffers = async (storeId: string) => {
    const { data, error } = await supabase
      .from('product_offers')
      .select(offerSelect)
      .eq('store_id', storeId)
      .eq('is_available', true)
      .or(nameOrQuery)
      .order('is_on_sale', { ascending: false })
      .limit(PER_STORE_LIMIT)

    if (error) {
      console.warn('[price-alerts] store offer search:', storeId, error.message)
      return
    }

    for (const row of data || []) {
      const match = mapOfferRow(row as Record<string, unknown>, trimmed, tokens)
      if (!match) continue
      const key = `${match.productId}:${match.storeId}`
      const existing = byKey.get(key)
      if (!existing || match.score > existing.score) {
        byKey.set(key, match)
      }
    }
  }

  await Promise.all(stores.map((storeId) => fetchStoreOffers(storeId)))

  // Ekstra: produkter fundet via name_generic → hent tilbud i valgte butikker
  const { data: productRows } = await supabase
    .from('products')
    .select('id, name_generic, image_url')
    .or(productsOrQuery)
    .limit(200)

  const productIds = (productRows || [])
    .filter((p) => nameMatchesAllTokens(String(p.name_generic || ''), tokens))
    .map((p) => String(p.id))

  if (productIds.length > 0) {
    const { data: extraOffers } = await supabase
      .from('product_offers')
      .select(offerSelect)
      .in('product_id', productIds)
      .in('store_id', stores)
      .eq('is_available', true)
      .limit(500)

    for (const row of extraOffers || []) {
      const match = mapOfferRow(row as Record<string, unknown>, trimmed, tokens)
      if (!match) continue
      const key = `${match.productId}:${match.storeId}`
      const existing = byKey.get(key)
      if (!existing || match.score > existing.score) {
        byKey.set(key, match)
      }
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_GROUP_ALERTS)
}

export function summarizeMatches(matches: PriceAlertOfferMatch[]) {
  const storeIds = new Set(matches.map((m) => m.storeId))
  return {
    matchCount: matches.length,
    storeCount: storeIds.size,
    canCreateGroup: matches.length >= 2,
    capped: matches.length >= MAX_GROUP_ALERTS,
  }
}
