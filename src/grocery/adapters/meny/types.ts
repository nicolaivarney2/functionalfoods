/** iPaper "enrichment" type 13 = produkt-hotspot i avisen. */
export interface MenyEnrichmentProduct {
  type: 13
  id: number
  /** EAN (for MENY-vejevarer et butiksnummer, fx 20…). */
  productId: string | number
  /** "Innocent Kids Jordbær4x150 (Innocent Juice, Shot eller Smoothie)" */
  name: string
  /** "Innocent Kids Jordbær4x150. 600 ml (Max. literpris 49,88)" */
  desc: string | null
  price: number | null
  pageIndex: number | null
  /** Avisens gruppe/overskrift, fx "Innocent Juice, Shot eller Smoothie". */
  alttext: string | null
  packagesize?: number | null
}

export interface MenyAvis {
  paperId: number
  /** "MENY uge 4026" */
  name: string
  url: string
  /** YYYY-MM-DD (København). */
  validFrom: string
  /** YYYY-MM-DD, sidste dag (inklusive). */
  validTo: string
  pageTexts: string[]
  products: MenyEnrichmentProduct[]
}

/** Klassifikation fra samme EAN i Salling-kataloget (netto/føtex/bilka). */
export interface MenyNativeCategory {
  lvl0: string | null
  lvl1: string | null
}

export interface MenyPageNote {
  memberPriceCents: number | null
  limitText: string | null
}

export interface MenyAvisItem {
  avis: Pick<MenyAvis, 'paperId' | 'name' | 'url' | 'validFrom' | 'validTo'>
  product: MenyEnrichmentProduct
  ean: string
  native: MenyNativeCategory | null
  note: MenyPageNote | null
  /** Afdeling til FF (category_lvl0). */
  department: string | null
  category: string | null
}
