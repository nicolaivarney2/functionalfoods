export interface OrganicPreferenceInput {
  prioritizeOrganic?: boolean
  prioritizeAnimalOrganic?: boolean
}

export type ProductOrganicTagId = 'organic-priority' | 'organic-animal'

/** ØKO eller ØKOLOGI i produktnavn — ikke kategori, ikke økologisk/organic alene. */
export function hasOkoOrOkologiInProductName(name: string): boolean {
  return /(øko\.?|økologi)/i.test(String(name || ''))
}

export function hasOrganicInProductName(name: string): boolean {
  return hasOkoOrOkologiInProductName(name)
}

export function isMejeriOrKødProductCategory(
  category: string | null | undefined,
  department?: string | null
): boolean {
  const hay = `${category ?? ''} ${department ?? ''}`.toLowerCase()
  return /mejeri|kød/.test(hay)
}

export function normalizeProductOrganicTags(raw: unknown): ProductOrganicTagId[] {
  if (!Array.isArray(raw)) return []
  const out = new Set<ProductOrganicTagId>()
  for (const item of raw) {
    const t = String(item).trim()
    if (t === 'organic-priority' || t === 'organic-animal') {
      out.add(t)
    }
  }
  return Array.from(out)
}

export function computeProductOrganicTags(
  nameGeneric: string | null | undefined,
  offerNames: string[],
  category: string | null | undefined,
  department?: string | null
): ProductOrganicTagId[] {
  const names = [nameGeneric ?? '', ...offerNames].filter(Boolean)
  if (!names.some((n) => hasOkoOrOkologiInProductName(n))) return []

  const tags: ProductOrganicTagId[] = ['organic-priority']
  if (isMejeriOrKødProductCategory(category, department)) {
    tags.push('organic-animal')
  }
  return tags
}

export function userWantsOrganicPreference(prefs: OrganicPreferenceInput): boolean {
  return !!(prefs.prioritizeOrganic || prefs.prioritizeAnimalOrganic)
}

export function productMatchesOrganicPreference(
  prefs: OrganicPreferenceInput,
  productOrganicTags: string[]
): boolean {
  const tags = normalizeProductOrganicTags(productOrganicTags)

  if (prefs.prioritizeOrganic && tags.includes('organic-priority')) return true
  if (prefs.prioritizeAnimalOrganic && tags.includes('organic-animal')) return true
  return false
}

/** Bruger accepterer op til 10 % dyrere øko-varer når præferencen er slået til. */
export const ORGANIC_PRICE_PREMIUM_FRACTION = 0.1

export function comparisonPriceForOrganicPreference(
  totalPrice: number,
  prefs: OrganicPreferenceInput,
  productOrganicTags: string[]
): number {
  if (!userWantsOrganicPreference(prefs)) return totalPrice
  if (!productMatchesOrganicPreference(prefs, productOrganicTags)) return totalPrice
  return totalPrice * (1 - ORGANIC_PRICE_PREMIUM_FRACTION)
}

export function resolveProductOrganicTags(
  storedTags: unknown,
  productName?: string | null
): ProductOrganicTagId[] {
  const normalized = normalizeProductOrganicTags(storedTags)
  if (normalized.length > 0) return normalized
  if (productName && hasOrganicInProductName(productName)) {
    return ['organic-priority']
  }
  return []
}
