import { MADBUDGET_OFFER_ONLY_STORE_KEYS } from '@/lib/madbudget-stores'

/** Katalog-butikker med stabil prisimport — bruges kun server-side til vejledende priser. */
export const GUIDE_PRICE_REFERENCE_STORE_KEYS = ['rema-1000', 'netto'] as const

export const GUIDE_PRICE_REFERENCE_STORE_IDS = [1, 2] as const

export const GUIDE_PRICES_STORAGE_KEY = 'ff_madbudget_guide_prices'

export function storeNeedsGuidePrices(storeKey: string): boolean {
  return MADBUDGET_OFFER_ONLY_STORE_KEYS.has(storeKey)
}

export function anySelectedStoreNeedsGuidePrices(storeKeys: string[]): boolean {
  return storeKeys.some(storeNeedsGuidePrices)
}

type PriceEntry = Record<string, unknown> & {
  name?: string
  totalPrice?: number
  price?: number
  totalNormalPrice?: number
  quantityNeeded?: number
  isGuidePrice?: boolean
  isSnapshotPrice?: boolean
  isOnSale?: boolean
}

export function productDisplayTotal(product: PriceEntry): number {
  return product.totalPrice ?? product.price ?? 0
}

/**
 * For tilbuds-butikker: udfyld manglende varer med bedste pris fra reference-butikker.
 * Muterer `result` in-place. Reference-butikker skal allerede være beregnet i `result`.
 */
export function applyGuidePricesForOfferStores(
  result: Record<string, Record<string, PriceEntry>>,
  storeKeys: string[],
  shoppingListItems: Array<{ name?: string; isBasis?: boolean }>
): number {
  if (!anySelectedStoreNeedsGuidePrices(storeKeys)) return 0

  let guideCount = 0

  for (const storeKey of storeKeys) {
    if (!storeNeedsGuidePrices(storeKey)) continue

    for (const item of shoppingListItems) {
      if (item.isBasis) continue
      const shoppingItemName = item.name?.toLowerCase().trim()
      if (!shoppingItemName) continue
      const existing = result[storeKey]?.[shoppingItemName]
      // Behold rigtige tilbud; erstat snapshot-priser med vejledende referencepris
      if (existing && !existing.isSnapshotPrice) continue

      let bestRef: PriceEntry | null = null
      let bestTotal = Infinity

      for (const refKey of GUIDE_PRICE_REFERENCE_STORE_KEYS) {
        const refProduct = result[refKey]?.[shoppingItemName]
        if (!refProduct || refProduct.isGuidePrice) continue
        const total = Number(refProduct.totalPrice ?? refProduct.price ?? 0)
        if (!Number.isFinite(total) || total <= 0) continue
        if (total < bestTotal) {
          bestTotal = total
          bestRef = refProduct
        }
      }

      if (!bestRef) continue

      if (!result[storeKey]) result[storeKey] = {}
      result[storeKey][shoppingItemName] = {
        ...bestRef,
        isGuidePrice: true,
        isOnSale: false,
        discountPercentage: 0,
        totalNormalPrice: undefined,
        normalPrice: undefined,
        name: item.name,
      }
      guideCount++
    }
  }

  return guideCount
}

/** Fjern reference-butikker fra resultat hvis brugeren ikke har valgt dem. */
export function stripUnrequestedReferenceStores(
  result: Record<string, Record<string, PriceEntry>>,
  requestedStoreKeys: string[]
): void {
  for (const refKey of GUIDE_PRICE_REFERENCE_STORE_KEYS) {
    if (!requestedStoreKeys.includes(refKey) && result[refKey]) {
      delete result[refKey]
    }
  }
}

export function resolveProductForDisplay(
  product: PriceEntry | null | undefined,
  useGuidePrices: boolean
): PriceEntry | null {
  if (!product) return null
  if (product.isGuidePrice && !useGuidePrices) return null
  return product
}

/** Fjern vejledende priser før eksport (fx smart shopping). */
export function stripGuidePricesFromStoreMap(
  storeMap: Record<string, PriceEntry> | undefined | null
): Record<string, PriceEntry> {
  if (!storeMap) return {}
  const out: Record<string, PriceEntry> = {}
  for (const [key, product] of Object.entries(storeMap)) {
    if (!product.isGuidePrice) out[key] = product
  }
  return out
}
