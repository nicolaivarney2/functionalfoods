/**
 * EAN/GTIN helpers — bruges til billed-fallback på tværs af kæder.
 */

/** Kæder med `{chain}-{source_id}` produkt-id i FF main DB. */
export const FF_PRODUCT_ID_CHAINS = [
  'netto',
  'bilka',
  'foetex',
  'rema-1000',
  'lidl',
  '365discount',
  'kvickly',
  'superbrugsen',
  'brugsen',
  'meny',
  'spar',
  'loevbjerg',
  'abc-lavpris',
  'min-koebmand',
  'nemlig',
] as const

/** Prioritet når flere kæder har billede for samme EAN (bedste packshots først). */
export const EAN_IMAGE_SOURCE_PRIORITY: readonly string[] = [
  'netto',
  'bilka',
  'foetex',
  'rema-1000',
  'nemlig',
  'meny',
  'spar',
  'min-koebmand',
  'lidl',
  'kvickly',
  '365discount',
  'superbrugsen',
  'brugsen',
  'loevbjerg',
  'abc-lavpris',
]

export function normalizeEan(raw: string | number | null | undefined): string | null {
  if (raw == null) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 14) return null
  return digits
}

/** FF product id er typisk `{chain}-{source_id}` — source_id er ofte EAN hos Goma/Netto. */
export function extractEanFromFfProductId(productId: string | null | undefined): string | null {
  if (!productId) return null
  const dash = productId.lastIndexOf('-')
  if (dash < 0) return normalizeEan(productId)
  return normalizeEan(productId.slice(dash + 1))
}

export function extractEanFromSourceId(sourceId: string | null | undefined): string | null {
  return normalizeEan(sourceId)
}

export function resolveProductEan(input: {
  ean?: string | null
  productId?: string | null
}): string | null {
  return normalizeEan(input.ean) ?? extractEanFromFfProductId(input.productId)
}

export function siblingFfProductIdsForEan(ean: string): string[] {
  return FF_PRODUCT_ID_CHAINS.map((chain) => `${chain}-${ean}`)
}

export function chainFromFfProductId(productId: string | null | undefined): string | null {
  if (!productId) return null
  const dash = productId.indexOf('-')
  if (dash <= 0) return null
  return productId.slice(0, dash)
}

export function eanImageSourceRank(productId: string | null | undefined): number {
  const chain = chainFromFfProductId(productId)
  if (!chain) return EAN_IMAGE_SOURCE_PRIORITY.length
  const idx = EAN_IMAGE_SOURCE_PRIORITY.indexOf(chain)
  return idx >= 0 ? idx : EAN_IMAGE_SOURCE_PRIORITY.length
}
