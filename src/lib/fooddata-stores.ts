/**
 * Store IDs in the shared fooddata catalog.
 */

export const FOODDATA_ACTIVE_SYNC_STORE_IDS = [
  'bilka',
  'netto',
  'foetex',
  'fotex',
  'rema-1000',
] as const

export const FOODDATA_ALL_CHAIN_STORE_IDS = [
  ...FOODDATA_ACTIVE_SYNC_STORE_IDS,
  'nemlig',
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
] as const

export const FOODDATA_STORE_IDS = [...new Set(FOODDATA_ALL_CHAIN_STORE_IDS)] as readonly string[]

export type FooddataStoreId = (typeof FOODDATA_ALL_CHAIN_STORE_IDS)[number]

export function isFooddataStoreId(storeId: string | null | undefined): boolean {
  if (!storeId) return false
  return FOODDATA_STORE_IDS.includes(storeId.toLowerCase())
}

export function mapStoreIdToDisplayName(storeId: string | null | undefined): string {
  if (!storeId) return 'Ukendt butik'
  const id = storeId.toLowerCase()
  switch (id) {
    case 'netto':
      return 'Netto'
    case 'rema-1000':
    case 'rema':
      return 'REMA 1000'
    case 'foetex':
    case 'fotex':
      return 'Føtex'
    case 'bilka':
      return 'Bilka'
    case '365discount':
    case '365-discount':
      return '365 Discount'
    case 'lidl':
      return 'Lidl'
    case 'nemlig':
      return 'Nemlig.com'
    case 'meny':
      return 'MENY'
    case 'spar':
      return 'Spar'
    case 'kvickly':
      return 'Kvickly'
    case 'superbrugsen':
    case 'super-brugsen':
      return 'SuperBrugsen'
    case 'brugsen':
      return 'Brugsen'
    case 'loevbjerg':
      return 'Løvbjerg'
    case 'abc-lavpris':
      return 'ABC Lavpris'
    case 'min-koebmand':
      return 'Min Købmand'
    default:
      return storeId
  }
}
