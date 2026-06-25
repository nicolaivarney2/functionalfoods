/** Tilbuds-only kæder uden fuldt katalog — får vejledende priser fra reference-butikker. */
export const MADBUDGET_OFFER_ONLY_STORE_KEYS = new Set(['meny', 'spar', 'løvbjerg', 'min-koebmand'])

/**
 * Butikker brugt i madbudget / indkøbsundersøgelse (id matcher family_profiles.selected_stores).
 * Id 5 (Nemlig.com) er bevidst bevaret for id-troskab mod gemte profiler, men udelades fra
 * vælgeren — vi har ikke data derfra.
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
]

/** Id'er bevaret i kataloget for troskab, men ikke valgbare (ingen data). */
const MADBUDGET_HIDDEN_STORE_IDS = new Set([5]) // Nemlig.com

/** Butikker brugeren faktisk kan vælge — kun kæder vi har data for. */
export const MADBUDGET_SELECTABLE_STORES = MADBUDGET_STORE_CATALOG.filter(
  (s) => !MADBUDGET_HIDDEN_STORE_IDS.has(s.id)
)

export function storesForSurvey(selectedStoreIds: number[] | null | undefined) {
  const ids = selectedStoreIds?.filter((n) => typeof n === 'number') ?? []
  if (ids.length === 0) return [...MADBUDGET_STORE_CATALOG]
  return MADBUDGET_STORE_CATALOG.filter((s) => ids.includes(s.id))
}
