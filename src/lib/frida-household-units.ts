/**
 * Husholdningsenheder → gram, knyttet til Frida-fødevarer.
 * `household_units` på frida_ingredients er kilden. Disse mønstre er fallback
 * når rækken ikke har enheden (fx "2 skiver rugbrød" før seed).
 */

export type HouseholdUnitMap = Record<string, number>

const SLICE = new Set(['skive', 'skiver'])
const PIECE = new Set(['stk', 'st', 'stykke', 'stykker', 'styk'])
const CLOVE = new Set(['fed', 'fedd'])
const GLASS = new Set(['glas', 'kop'])
const HANDFUL = new Set(['håndfuld', 'handfuld', 'håndfulde'])

export function normalizeHouseholdUnit(unit: string): string {
  const u = (unit || '').toLowerCase().trim()
  if (SLICE.has(u)) return 'skive'
  if (PIECE.has(u)) return 'stk'
  if (CLOVE.has(u)) return 'fed'
  if (GLASS.has(u)) return 'glas'
  if (HANDFUL.has(u)) return 'håndfuld'
  return u
}

/** Navnemønster → gram pr. husholdningsenhed. Første match vinder. */
export const FRIDA_HOUSEHOLD_UNIT_PATTERNS: Array<{
  includes: string[]
  excludes?: string[]
  units: HouseholdUnitMap
}> = [
  { includes: ['rugbrød'], excludes: ['revet'], units: { skive: 45, stk: 45 } },
  { includes: ['toastbrød'], units: { skive: 25, stk: 25 } },
  { includes: ['hvedebrød'], units: { skive: 30, stk: 30 } },
  { includes: ['knækbrød'], units: { skive: 12, stk: 12 } },
  { includes: ['burgerbolle'], units: { stk: 70 } },
  { includes: ['pølsebrød'], units: { stk: 50 } },
  { includes: ['ost'], excludes: ['ostesauce', 'flødeost'], units: { skive: 20, stk: 20 } },
  { includes: ['pålæg', 'skinke', 'salami', 'spegepølse', 'rullepølse'], units: { skive: 12 } },
  { includes: ['bacon'], units: { skive: 12, stk: 12 } },
  { includes: ['æg, høne'], excludes: ['hvide', 'blomme', 'tørret'], units: { stk: 56 } },
  { includes: ['hvidløg'], units: { fed: 3, stk: 3 } },
  { includes: ['banan'], units: { stk: 100 } },
  { includes: ['æble'], units: { stk: 130 } },
  { includes: ['appelsin'], units: { stk: 130 } },
  { includes: ['tomat'], excludes: ['puré', 'ketchup', 'soltørret'], units: { stk: 80 } },
  { includes: ['avocado'], units: { stk: 150 } },
  { includes: ['kartoffel'], excludes: ['mos', 'chips', 'pommes'], units: { stk: 80 } },
  { includes: ['gulerod'], units: { stk: 60 } },
  { includes: ['løg'], excludes: ['forårsløg', 'purløg', 'hvidløg'], units: { stk: 80 } },
  { includes: ['citron'], excludes: ['saft'], units: { stk: 60 } },
  { includes: ['mælk'], units: { glas: 200 } },
  { includes: ['juice', 'appelsinjuice'], units: { glas: 200 } },
]

export function householdGramsFromName(foodName: string, unit: string): number | null {
  const key = normalizeHouseholdUnit(unit)
  if (!key) return null
  const name = foodName.toLowerCase()
  for (const row of FRIDA_HOUSEHOLD_UNIT_PATTERNS) {
    if (!row.includes.some((p) => name.includes(p))) continue
    if (row.excludes?.some((p) => name.includes(p))) continue
    const grams = row.units[key]
    if (grams != null && grams > 0) return grams
  }
  return null
}

export function householdGramsFromMap(map: HouseholdUnitMap | null | undefined, unit: string): number | null {
  if (!map) return null
  const key = normalizeHouseholdUnit(unit)
  const grams = map[key]
  return grams != null && Number.isFinite(grams) && grams > 0 ? grams : null
}
