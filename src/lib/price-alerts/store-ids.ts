import { FOODDATA_ACTIVE_SYNC_STORE_IDS } from '@/lib/fooddata-stores'
import { mapStoreIdToDisplayName } from '@/lib/fooddata-stores'

/** UI-butiksnavne → fooddata store_id slugs (matcher dagligvarer-filtre). */
const UI_STORE_TO_SLUG: Record<string, string> = {
  Netto: 'netto',
  'REMA 1000': 'rema-1000',
  '365 Discount': '365discount',
  '365discount': '365discount',
  Lidl: 'lidl',
  Føtex: 'foetex',
  Foetex: 'foetex',
  Bilka: 'bilka',
  Nemlig: 'nemlig',
  'Nemlig.com': 'nemlig',
  MENY: 'meny',
  MENU: 'meny',
  Spar: 'spar',
  Kvickly: 'kvickly',
  superbrugsen: 'superbrugsen',
  'Super Brugsen': 'superbrugsen',
  Brugsen: 'brugsen',
  Løvbjerg: 'loevbjerg',
  'ABC Lavpris': 'abc-lavpris',
  'min-koebmand': 'min-koebmand',
  'Min Købmand': 'min-koebmand',
}

/** Primære kæder når brugeren ikke vælger butikker. */
export const DEFAULT_PRICE_ALERT_STORE_IDS = [...FOODDATA_ACTIVE_SYNC_STORE_IDS]

export function normalizeDagligvarerStoreIds(storeIds?: string[] | null): string[] {
  if (!storeIds?.length) return [...DEFAULT_PRICE_ALERT_STORE_IDS]
  const slugs = storeIds
    .map((s) => UI_STORE_TO_SLUG[s] || s.toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
  return [...new Set(slugs)]
}

export function displayStoreName(storeId: string): string {
  return mapStoreIdToDisplayName(storeId)
}
