/**
 * Pakke- og enhedsberegning til indkøbsliste-priser.
 * Bruges af POST /api/madbudget/shopping-list-prices (web + app kalder samme API).
 *
 * App-repo: genberegn IKKE priser lokalt — kun vis API-svar via shopping-list-display.ts.
 */

import {
  comparisonPriceForOrganicPreference,
  resolveProductOrganicTags,
  type OrganicPreferenceInput,
} from '@/lib/madbudget/organic-preference'

export type ParsedAmount = { value: number; unit: string }

/** Ensartet enhedsnormalisering (gram → g, osv.). */
export function normalizeShoppingUnit(unit: string): string {
  unit = unit.toLowerCase().trim()
  if (/\bkg\b|\bkilo\b|\bkilogram\b/.test(unit)) return 'kg'
  if (/\bg\b|\bgram\b|\bgrams\b/.test(unit)) return 'g'
  if (/\bml\b|\bmilliliter\b/.test(unit)) return 'ml'
  if (/\bl\b|\bliter\b/.test(unit)) return 'l'
  if (/\bstk\b|\bstyk\b|\bstykker\b/.test(unit)) return 'stk'
  if (/\bspsk\b|spiseskefuld|spiseskefulde/.test(unit)) return 'spsk'
  if (/\btsk\b|teskefuld|teskefulde/.test(unit)) return 'tsk'
  if (/\bbundt\b|\bbundter\b/.test(unit)) return 'bundt'
  return unit
}

export function isWeightOrVolumeUnit(unit: string): boolean {
  const u = normalizeShoppingUnit(unit)
  return u === 'g' || u === 'kg' || u === 'ml' || u === 'l'
}

/** Normaliser opskriftsmængde til g/ml så 1,4 kg og 1400 g behandles ens. */
export function canonicalNeededAmount(
  neededAmount: number,
  neededUnit: string
): { amount: number; unit: string } {
  const u = normalizeShoppingUnit(neededUnit)
  if (u === 'kg') return { amount: neededAmount * 1000, unit: 'g' }
  if (u === 'l') return { amount: neededAmount * 1000, unit: 'ml' }
  return { amount: neededAmount, unit: u }
}

/** Afvis pakkeberegninger hvor enheder sandsynligvis er fejltolket (fx 1 g = 1 glas). */
export function isSuspiciousQuantity(
  neededUnit: string,
  neededAmount: number,
  convertedAmount: number,
  quantityNeeded: number
): boolean {
  if (quantityNeeded <= 3 || neededAmount <= 0) return false

  const need = normalizeShoppingUnit(neededUnit)
  const isWeightVolume = need === 'g' || need === 'kg' || need === 'ml' || need === 'l'

  if (!isWeightVolume) return false
  if (convertedAmount < 10 && quantityNeeded > 3) return true
  if (neededAmount <= 250 && quantityNeeded >= 10) return true

  return false
}

/** Beregn antal pakker/stk ud fra opskriftsmængde og butikkens pakkestørrelse. */
export function computePackageQuantity(
  neededAmount: number,
  neededUnit: string,
  packValue: number,
  packUnit: string,
  gramsPerUnit?: number
): { quantityNeeded: number; convertedAmount: number } | null {
  if (neededAmount <= 0) return { quantityNeeded: 1, convertedAmount: packValue }

  const normalizedNeeded = normalizeShoppingUnit(neededUnit)
  let convertedAmount = convertToUnit(packValue, packUnit, normalizedNeeded, gramsPerUnit)

  if (convertedAmount === null) {
    const normPack = normalizeShoppingUnit(packUnit)
    if (normPack === normalizedNeeded) convertedAmount = packValue
    else return null
  }

  if (!Number.isFinite(convertedAmount) || convertedAmount <= 0) return null

  const quantityNeeded =
    convertedAmount >= neededAmount ? 1 : Math.ceil(neededAmount / convertedAmount)

  if (
    !Number.isFinite(quantityNeeded) ||
    quantityNeeded <= 0 ||
    quantityNeeded > 120 ||
    isSuspiciousQuantity(normalizedNeeded, neededAmount, convertedAmount, quantityNeeded)
  ) {
    return null
  }

  return { quantityNeeded, convertedAmount }
}

export function parseProductAmount(
  amount: string | number | null,
  unit: string | null
): ParsedAmount | null {
  if (typeof amount === 'number' && !isNaN(amount)) {
    return {
      value: amount,
      unit: (unit || '').toLowerCase().trim() || 'stk',
    }
  }

  if (!amount && !unit) return null

  const amountStr = amount !== null && amount !== undefined ? String(amount) : null

  if (amountStr && unit) {
    const num = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(num)) return null
    return { value: num, unit: unit.toLowerCase() }
  }

  if (amountStr) {
    const match = amountStr.match(/^([\d.,]+)\s*([a-zæøå]+)?$/i)
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'))
      if (isNaN(num)) return null
      const parsedUnit = (match[2] || unit || '').toLowerCase().trim()
      return { value: num, unit: parsedUnit || 'stk' }
    }
  }

  return null
}

/** Parse amount/unit fra produktnavn (fx "ØKO. SALAT MIX 75 g"). */
export function parseAmountFromNameStore(name: string): ParsedAmount | null {
  if (!name) return null
  const normalized = name.toLowerCase().replace(',', '.')

  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|stk|styk|stykker|ml|l)\b/)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null

  const rawUnit = match[2]
  let unit = rawUnit
  if (rawUnit === 'gram') unit = 'g'
  if (rawUnit === 'styk' || rawUnit === 'stykker') unit = 'stk'

  return { value, unit }
}

/**
 * Konverter mængde mellem enheder.
 * gramsPerUnit: vægt i gram pr. stk fra ingredients.grams_per_unit.
 */
export function convertToUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  gramsPerUnit?: number
): number | null {
  const from = normalizeShoppingUnit(fromUnit)
  const to = normalizeShoppingUnit(toUnit)

  if (from === to) return value

  if (from === 'bundt' && to === 'stk') return value
  if (from === 'stk' && to === 'bundt') return value

  if (gramsPerUnit != null && gramsPerUnit > 0) {
    if (from === 'g' && to === 'stk') return value / gramsPerUnit
    if (from === 'stk' && to === 'g') return value * gramsPerUnit
    if (from === 'kg' && to === 'stk') return (value * 1000) / gramsPerUnit
    if (from === 'stk' && to === 'kg') return (value * gramsPerUnit) / 1000
  }

  if (from === 'kg' && to === 'g') return value * 1000
  if (from === 'g' && to === 'kg') return value / 1000
  if (from === 'l' && to === 'ml') return value * 1000
  if (from === 'ml' && to === 'l') return value / 1000

  if (from === 'spsk' && to === 'g') return value * 15
  if (from === 'spsk' && to === 'ml') return value * 15
  if (from === 'tsk' && to === 'g') return value * 5
  if (from === 'tsk' && to === 'ml') return value * 5
  if (from === 'bundt' && to === 'g') return value * 25
  if (from === 'g' && to === 'spsk') return value / 15
  if (from === 'g' && to === 'tsk') return value / 5
  if (from === 'g' && to === 'bundt') return value / 25
  if (from === 'ml' && to === 'spsk') return value / 15
  if (from === 'ml' && to === 'tsk') return value / 5

  return null
}

export function selectMatchesForStore(matches: any[], storeKey: string): any[] {
  return matches.filter((m) =>
    matchBelongsToStore(m.product_external_id, m.product_store_snapshot, storeKey)
  )
}

export function buildSnapshotProduct(
  match: any,
  opts: {
    snapshotPrice: number
    neededAmount: number
    neededUnit: string
    storeKey: string
    gramsPerUnit?: number
    productOrganicTagsMap: Map<string, string[]>
    organicPrefs: OrganicPreferenceInput
  }
): { product: any; comparisonPrice: number; excess: number } | null {
  const {
    snapshotPrice,
    neededAmount,
    neededUnit,
    storeKey,
    gramsPerUnit,
    productOrganicTagsMap,
    organicPrefs,
  } = opts

  const normalizedNeeded = normalizeShoppingUnit(neededUnit)
  const { amount: neededCanonical, unit: neededCanonicalUnit } = canonicalNeededAmount(
    neededAmount,
    normalizedNeeded
  )

  let quantityNeeded = 1
  let convertedAmount = 1

  const parsedFromName = parseAmountFromNameStore(String(match.product_name_snapshot || ''))

  const computed =
    (parsedFromName
      ? computePackageQuantity(
          neededCanonical,
          neededCanonicalUnit,
          parsedFromName.value,
          parsedFromName.unit,
          gramsPerUnit
        )
      : null) ??
    (gramsPerUnit
      ? computePackageQuantity(neededCanonical, neededCanonicalUnit, 1, 'stk', gramsPerUnit)
      : null)

  if (computed) {
    quantityNeeded = computed.quantityNeeded
    convertedAmount = computed.convertedAmount
  } else if (isWeightOrVolumeUnit(normalizedNeeded)) {
    // Ingen gæt på 1 pakke for vægt/volumen — brug live tilbud eller spring snapshot over.
    return null
  }

  const totalPrice = snapshotPrice * quantityNeeded
  const excess = convertedAmount * quantityNeeded - neededCanonical
  const organicTags = resolveProductOrganicTags(
    productOrganicTagsMap.get(match.product_external_id),
    match.product_name_snapshot
  )
  const comparisonPrice = comparisonPriceForOrganicPreference(totalPrice, organicPrefs, organicTags)

  return {
    comparisonPrice,
    excess,
    product: {
      product_external_id: match.product_external_id,
      name: match.product_name_snapshot,
      price: snapshotPrice,
      totalPrice,
      normalPrice: null,
      totalNormalPrice: null,
      isOnSale: false,
      discountPercentage: null,
      amount: '1',
      unit: 'stk',
      productAmount: convertedAmount,
      neededAmount: neededCanonical,
      quantityNeeded,
      isSufficient: convertedAmount * quantityNeeded >= neededCanonical,
      isSnapshotPrice: true,
      pricingSource: 'fooddata_snapshot',
      store: match.product_store_snapshot || storeKey,
      isOrganicMatch: organicTags.length > 0,
    },
  }
}

/** True when a curated match belongs to the store tab being priced. */
export function matchBelongsToStore(
  productExternalId: string,
  productStoreSnapshot: string | null | undefined,
  storeKey: string
): boolean {
  const id = String(productExternalId || '').toLowerCase().trim()
  const storePrefixes: Record<string, string[]> = {
    'rema-1000': ['rema-1000-'],
    netto: ['netto-'],
    føtex: ['føtex-', 'fotex-', 'foetex-'],
    bilka: ['bilka-'],
    nemlig: ['nemlig-'],
    meny: ['meny-'],
    spar: ['spar-'],
    løvbjerg: ['loevbjerg-', 'løvbjerg-', 'lovbjerg-'],
    'min-koebmand': ['min-koebmand-'],
    lidl: ['lidl-'],
    '365discount': ['365discount-', '365-discount-'],
    kvickly: ['kvickly-'],
    superbrugsen: ['superbrugsen-', 'super-brugsen-'],
    brugsen: ['brugsen-'],
    'abc-lavpris': ['abc-lavpris-'],
  }

  const prefixes = storePrefixes[storeKey] || [`${storeKey}-`]
  if (prefixes.some((prefix) => id.startsWith(prefix))) return true

  if (!productStoreSnapshot) return false

  const snap = String(productStoreSnapshot)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const storeAliases: Record<string, string[]> = {
    'rema-1000': ['rema-1000', 'rema 1000', 'rema'],
    netto: ['netto'],
    føtex: ['fotex', 'foetex', 'føtex'],
    bilka: ['bilka', 'salling'],
    nemlig: ['nemlig'],
    meny: ['meny'],
    spar: ['spar'],
    løvbjerg: ['loevbjerg', 'lovbjerg', 'løvbjerg'],
    'min-koebmand': ['min-koebmand', 'min købmand'],
    lidl: ['lidl'],
    '365discount': ['365discount', '365 discount', '365-discount'],
    kvickly: ['kvickly'],
    superbrugsen: ['superbrugsen', 'super brugsen', 'super-brugsen'],
    brugsen: ['brugsen'],
    'abc-lavpris': ['abc-lavpris', 'abc lavpris'],
  }

  const aliases = storeAliases[storeKey] || [storeKey]
  return aliases.some((alias) => snap.includes(alias))
}
