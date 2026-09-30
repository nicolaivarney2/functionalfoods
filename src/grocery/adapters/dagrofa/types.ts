import type { DagrofaAvisChain } from './chains'

/** iPaper "enrichment" type 13 = produkt-hotspot i avisen. */
export interface DagrofaEnrichmentProduct {
  type: 13
  id: number
  /** EAN (for vejevarer et butiksnummer, fx 20…). */
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

export interface DagrofaAvis {
  chain: DagrofaAvisChain
  paperId: number
  /** "MENY uge 4026" */
  name: string
  url: string
  /** YYYY-MM-DD (København). */
  validFrom: string
  /** YYYY-MM-DD, sidste dag (inklusive). */
  validTo: string
  pageTexts: string[]
  products: DagrofaEnrichmentProduct[]
}

/** Klassifikation fra samme EAN i Salling-kataloget (netto/føtex/bilka). */
export interface DagrofaNativeCategory {
  lvl0: string | null
  lvl1: string | null
}

export interface DagrofaPageNote {
  memberPriceCents: number | null
  limitText: string | null
}

export interface DagrofaAvisItem {
  avis: Pick<DagrofaAvis, 'chain' | 'paperId' | 'name' | 'url' | 'validFrom' | 'validTo'>
  product: DagrofaEnrichmentProduct
  ean: string
  native: DagrofaNativeCategory | null
  note: DagrofaPageNote | null
  /** Afdeling til FF (category_lvl0). */
  department: string | null
  category: string | null
}
