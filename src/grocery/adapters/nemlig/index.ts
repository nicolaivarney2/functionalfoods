export { fetchNemligCatalog, openNemligSession } from './client'
export type { NemligCatalog, NemligSession } from './client'
export {
  mapNemligOffer,
  mapNemligProduct,
  NEMLIG_OFFER_SOURCE,
  nemligDepartment,
  nemligSourceId,
  resolveNemligPricing,
} from './mapper'
export { isNemligEnabled, nemligCatalogLooksComplete, syncNemlig } from './sync'
export type { NemligSyncOptions, NemligSyncResult } from './sync'
export type { NemligCatalogEntry, NemligProduct } from './types'
