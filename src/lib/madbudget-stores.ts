/** Butikker brugt i madbudget / indkøbsundersøgelse (id matcher family_profiles.selected_stores) */
export const MADBUDGET_STORE_CATALOG: { id: number; name: string }[] = [
  { id: 1, name: 'REMA 1000' },
  { id: 2, name: 'Netto' },
  { id: 3, name: 'Føtex' },
  { id: 4, name: 'Bilka' },
  { id: 5, name: 'Nemlig.com' },
  { id: 6, name: 'MENY' },
  { id: 7, name: 'Spar' },
  { id: 8, name: 'Løvbjerg' },
]

export function storesForSurvey(selectedStoreIds: number[] | null | undefined) {
  const ids = selectedStoreIds?.filter((n) => typeof n === 'number') ?? []
  if (ids.length === 0) return [...MADBUDGET_STORE_CATALOG]
  return MADBUDGET_STORE_CATALOG.filter((s) => ids.includes(s.id))
}
