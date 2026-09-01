import type { AlgoliaStoreData, SallingAlgoliaHit } from './types'

type BeforePriceHitContext = Pick<
  SallingAlgoliaHit,
  'cpOriginalPrice' | 'isInCurrentLeaflet' | 'cpOffer'
>

/** Live ugeavis — ikke CP-kampagne eller en efterladt førpris fra sidste uge. */
export function isLiveSallingOfferSignal(
  hit: Pick<SallingAlgoliaHit, 'isInCurrentLeaflet' | 'cpOffer'>,
): boolean {
  return Boolean(hit.isInCurrentLeaflet)
}

export interface RepresentativeStore {
  storeId: string
  data: AlgoliaStoreData
  beforePriceCents: number | null
}

/**
 * Resolve a proven "before" shelf price in øre.
 *
 * Priority:
 * 1. storeData.beforePrice when > current price
 * 2. hit.cpOriginalPrice when > current price
 * 3. Infer from unit-of-measure ratio when an offer signal exists
 */
export function resolveBeforePriceCents(
  storeData: AlgoliaStoreData,
  priceCents: number,
  hit: BeforePriceHitContext,
): number | null {
  if (priceCents <= 0) return null

  if (storeData.beforePrice && storeData.beforePrice > priceCents) {
    return Math.round(storeData.beforePrice)
  }

  if (hit.cpOriginalPrice && hit.cpOriginalPrice > priceCents) {
    return Math.round(hit.cpOriginalPrice)
  }

  const uomPrice = storeData.unitsOfMeasurePrice ?? 0
  const uomOfferPrice = storeData.unitsOfMeasureOfferPrice ?? 0
  const hasOfferSignal =
    isLiveSallingOfferSignal(hit) ||
    Boolean(storeData.offerDescription?.trim()) ||
    (storeData.unitsOfMeasureShowPrice > 0 &&
      uomOfferPrice > 0 &&
      storeData.unitsOfMeasureShowPrice === uomOfferPrice)

  if (
    hasOfferSignal &&
    uomPrice > 0 &&
    uomOfferPrice > 0 &&
    uomPrice > uomOfferPrice
  ) {
    const inferred = Math.round(priceCents * (uomPrice / uomOfferPrice))
    if (inferred > priceCents && inferred <= priceCents * 3) {
      return inferred
    }
  }

  return null
}

/**
 * Pick the storeData entry with the largest documented discount.
 * Tie-break: prefer in-stock entries.
 */
export function pickRepresentativeStore(
  storeData: Record<string, AlgoliaStoreData> | null,
  hit: BeforePriceHitContext,
): RepresentativeStore | null {
  if (!storeData) return null
  const entries = Object.entries(storeData)
  if (entries.length === 0) return null

  let best: RepresentativeStore & { discount: number } | null = null

  for (const [storeId, data] of entries) {
    if (!data || data.price <= 0) continue

    const beforePriceCents = resolveBeforePriceCents(data, data.price, hit)
    const discount =
      beforePriceCents !== null ? beforePriceCents - data.price : 0

    if (
      !best ||
      discount > best.discount ||
      (discount === best.discount && data.inStock && !best.data.inStock) ||
      (discount === best.discount &&
        Boolean(data.inStock) === Boolean(best.data.inStock) &&
        storeId < best.storeId)
    ) {
      best = {
        storeId,
        data,
        beforePriceCents:
          beforePriceCents !== null && beforePriceCents > data.price
            ? beforePriceCents
            : null,
        discount,
      }
    }
  }

  if (best) {
    return {
      storeId: best.storeId,
      data: best.data,
      beforePriceCents: best.beforePriceCents,
    }
  }

  // Fallback: any priced entry, prefer in-stock.
  for (const [storeId, data] of entries) {
    if (data?.inStock && data.price > 0) {
      const beforePriceCents = resolveBeforePriceCents(data, data.price, hit)
      return {
        storeId,
        data,
        beforePriceCents:
          beforePriceCents !== null && beforePriceCents > data.price
            ? beforePriceCents
            : null,
      }
    }
  }
  for (const [storeId, data] of entries) {
    if (data?.price > 0) {
      const beforePriceCents = resolveBeforePriceCents(data, data.price, hit)
      return {
        storeId,
        data,
        beforePriceCents:
          beforePriceCents !== null && beforePriceCents > data.price
            ? beforePriceCents
            : null,
      }
    }
  }

  const [storeId, data] = entries[0]
  return { storeId, data, beforePriceCents: null }
}

/** True if `storedCents` is still a live Algolia store price (øre, ±1). */
export function storedPriceMatchesAlgolia(
  storeData: Record<string, AlgoliaStoreData> | null,
  hit: BeforePriceHitContext,
  storedCents: number | null | undefined,
): boolean {
  if (storedCents == null) return false
  const prices: number[] = []
  const rep = pickRepresentativeStore(storeData, hit)
  if (rep && rep.data.price > 0) prices.push(Math.round(rep.data.price))
  if (storeData) {
    for (const data of Object.values(storeData)) {
      if (data && data.price > 0) prices.push(Math.round(data.price))
    }
  }
  return prices.some((p) => Math.abs(p - storedCents) <= 1)
}
