/** Tilbuds-only kæder uden fuldt katalog — får vejledende priser fra reference-butikker. */
export const MADBUDGET_OFFER_ONLY_STORE_KEYS = new Set([
  'meny',
  'spar',
  'min-koebmand',
  'lidl',
])

/**
 * Butikker brugt i madbudget / indkøbsundersøgelse (id matcher family_profiles.selected_stores).
 * Id 5 (Nemlig.com) er fuldt katalog via nemlig.com.
 *
 * Id 8 og 11–15 (Løvbjerg, 365 Discount, Kvickly, Super Brugsen, Brugsen, ABC Lavpris)
 * bliver i kataloget, så gamle profiler stadig kan slå navnet op, men de kan ikke vælges.
 * De har ingen kilde, efter Goma og Tjek er lukket.
 */
export const MADBUDGET_STORE_CATALOG: { id: number; name: string }[] = [
  { id: 1, name: 'REMA 1000' },
  { id: 2, name: 'Netto' },
  { id: 3, name: 'Føtex' },
  { id: 4, name: 'Bilka' },
  { id: 5, name: 'Nemlig.com' },
  { id: 6, name: 'MENY' },
  { id: 7, name: 'Spar' },
  { id: 8, name: 'Løvbjerg' },
  { id: 9, name: 'Min Købmand' },
  { id: 10, name: 'Lidl' },
  { id: 11, name: '365 Discount' },
  { id: 12, name: 'Kvickly' },
  { id: 13, name: 'Super Brugsen' },
  { id: 14, name: 'Brugsen' },
  { id: 15, name: 'ABC Lavpris' },
]

/** Gemte id'er uden tilbudskilde. Må ikke vises som butikker, vi dækker. */
export const MADBUDGET_UNAVAILABLE_STORE_IDS = new Set([8, 11, 12, 13, 14, 15])

/** Butikker brugeren kan vælge i madbudget/indkøbsundersøgelse. */
export const MADBUDGET_SELECTABLE_STORES = MADBUDGET_STORE_CATALOG.filter(
  (store) => !MADBUDGET_UNAVAILABLE_STORE_IDS.has(store.id),
)

export function selectableMadbudgetStoreIds(ids: number[] | null | undefined): number[] {
  const allowed = new Set(MADBUDGET_SELECTABLE_STORES.map((store) => store.id))
  return (ids ?? []).filter((id) => allowed.has(id))
}

const MADBUDGET_NAME_TO_SLUG: Record<string, string> = {
  'REMA 1000': 'rema-1000',
  Netto: 'netto',
  Føtex: 'foetex',
  Bilka: 'bilka',
  'Nemlig.com': 'nemlig',
  MENY: 'meny',
  Spar: 'spar',
  Løvbjerg: 'loevbjerg',
  'Min Købmand': 'min-koebmand',
  Lidl: 'lidl',
  '365 Discount': '365discount',
  Kvickly: 'kvickly',
  'Super Brugsen': 'superbrugsen',
  Brugsen: 'brugsen',
  'ABC Lavpris': 'abc-lavpris',
}

/** Map numeric madbudget store ids → fooddata store_id slugs. */
export function madbudgetStoreIdsToSlugs(ids: number[]): string[] {
  return [
    ...new Set(
      ids
        .map((id) => MADBUDGET_STORE_CATALOG.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .map((name) => MADBUDGET_NAME_TO_SLUG[name!] || name!.toLowerCase().replace(/\s+/g, '-')),
    ),
  ]
}

export function storesForSurvey(selectedStoreIds: number[] | null | undefined) {
  const ids = selectableMadbudgetStoreIds(selectedStoreIds)
  if (ids.length === 0) return [...MADBUDGET_SELECTABLE_STORES]
  return MADBUDGET_SELECTABLE_STORES.filter((s) => ids.includes(s.id))
}
