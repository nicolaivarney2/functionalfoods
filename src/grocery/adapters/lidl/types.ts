/** Vare i Lidls egen tilbudsavis (endpoints.leaflets.schwarz — Lidl-koncernens avis-platform). */
export interface LidlFlyerProduct {
  productId: string
  title: string
  price?: string
  brand?: string
  description?: string
  currencyText?: string
  wonCategoryPrimary?: string
  wonCategoryPrimaryPath?: string
  categoryPrimary?: string
  canonicalUrl: string
  url?: string
  image?: string
}

export interface LidlFlyer {
  id: string
  name: string
  title: string
  category?: string
  subcategory?: string
  /** YYYY-MM-DD — første dag tilbuddene gælder. */
  offerStartDate: string
  /** YYYY-MM-DD — sidste dag tilbuddene gælder (inklusiv). */
  offerEndDate: string
  flyerUrlAbsolute?: string
  products: Record<string, LidlFlyerProduct> | LidlFlyerProduct[] | null
}

export interface LidlFlyerResponse {
  success: boolean
  message?: string
  flyer?: LidlFlyer
}

/** Detaljer fra varens side på lidl.dk (pakning, enhedspris, førpris). */
export interface LidlProductDetails {
  eans: string[]
  alcoholic: boolean | null
  brand: string | null
  /** Prisen alle betaler; ellers Lidl Plus-prisen når varen kun findes med Lidl Plus. */
  price: number | null
  /** Lavere Lidl Plus-pris ved siden af den almindelige pris. */
  lidlPlusPrice: number | null
  requiresLidlPlus: boolean
  packaging: string | null
  basePrice: string | null
  deletedPrice: number | null
  discountText: string | null
  percentageDiscount: number | null
  startDate: string | null
  endDateExclusive: string | null
}

/** Én vare fra en aktiv avis, evt. beriget med produktsiden. */
export interface LidlAvisItem {
  flyer: Pick<LidlFlyer, 'id' | 'name' | 'title' | 'offerStartDate' | 'offerEndDate'> & {
    slug: string
    url: string
  }
  product: LidlFlyerProduct
  details: LidlProductDetails | null
}
