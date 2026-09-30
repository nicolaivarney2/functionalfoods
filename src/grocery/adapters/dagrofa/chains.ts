/**
 * Dagrofa-kæderne udgiver ugens avis på eget domæne via samme iPaper-konto
 * (license 1486) — samme dataformat for alle tre.
 */

export type DagrofaChainId = 'meny' | 'spar' | 'min-koebmand'
export type DagrofaAvisSource = `${DagrofaChainId}-avis`

export interface DagrofaAvisChain {
  chain: DagrofaChainId
  label: string
  avisUrl: string
  /** `product_offers.source` / `sync_logs.source`. */
  source: DagrofaAvisSource
  disabledEnv: string
  /** Navn på medlemsappen i "Medlemspris … med <app>". */
  memberApp: string | null
}

export const DAGROFA_AVIS_CHAINS: Record<DagrofaChainId, DagrofaAvisChain> = {
  meny: {
    chain: 'meny',
    label: 'MENY',
    avisUrl: 'https://ugensavis.meny.dk/',
    source: 'meny-avis',
    disabledEnv: 'GROCERY_MENY_AVIS_DISABLED',
    memberApp: 'MENY-appen',
  },
  spar: {
    chain: 'spar',
    label: 'SPAR',
    avisUrl: 'https://ugensavis.spar.dk/',
    source: 'spar-avis',
    disabledEnv: 'GROCERY_SPAR_AVIS_DISABLED',
    memberApp: 'SAMMEN-appen',
  },
  'min-koebmand': {
    chain: 'min-koebmand',
    label: 'Min Købmand',
    // ugensavis.minkøbmand.dk (punycode)
    avisUrl: 'https://ugensavis.xn--minkbmand-o8a.dk/',
    source: 'min-koebmand-avis',
    disabledEnv: 'GROCERY_MIN_KOEBMAND_AVIS_DISABLED',
    memberApp: null,
  },
}

export const DAGROFA_CHAIN_IDS = Object.keys(DAGROFA_AVIS_CHAINS) as DagrofaChainId[]

export function isDagrofaChainId(value: string): value is DagrofaChainId {
  return (DAGROFA_CHAIN_IDS as string[]).includes(value)
}
