/**
 * Goma vs grocery-service per-chain comparison.
 *
 * Returns counts from both data sources so the admin dashboard can show
 * progress toward Goma sunset. Used to verify our new grocery service
 * matches/exceeds Goma before flipping /dagligvarer to the new backend.
 */

import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getGroceryServiceClient } from '@/grocery/db/client'
import { CHAIN_COVERAGE, type SourceChain } from '@/grocery/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CHAINS: SourceChain[] = [
  'netto',
  'foetex',
  'bilka',
  'rema-1000',
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
]

/**
 * Goma sometimes uses ASCII variants for store_ids that lack æ/ø/å normalization.
 * E.g. it stores Føtex as `fotex` and Løvbjerg as `lovbjerg`. We sum across all
 * variants when computing the Goma side.
 */
const GOMA_STORE_ID_ALIASES: Partial<Record<SourceChain, string[]>> = {
  foetex: ['foetex', 'fotex'],
  loevbjerg: ['loevbjerg', 'lovbjerg'],
}

interface CompareRow {
  chain: SourceChain
  coverage: 'full' | 'offers-only' | 'none'
  goma_total: number
  goma_on_sale: number
  grocery_total: number
  grocery_on_sale: number
  delta_total: number
  delta_on_sale: number
}

interface CompareResponse {
  generated_at: string
  duration_ms: number
  rows: CompareRow[]
  totals: {
    goma_total: number
    goma_on_sale: number
    grocery_total: number
    grocery_on_sale: number
  }
  goma_grand_total: number
  goma_grand_on_sale: number
  grocery_grand_total: number
  grocery_grand_on_sale: number
}

async function countOffers(
  client: SupabaseClient,
  storeIds: string[],
  onSaleOnly: boolean,
): Promise<number> {
  let sum = 0
  for (const storeId of storeIds) {
    let q = client
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
    if (onSaleOnly) q = q.eq('is_on_sale', true)
    const { count, error } = await q
    if (error) throw new Error(`count(${storeId}): ${error.message}`)
    sum += count ?? 0
  }
  return sum
}

export async function GET() {
  const t0 = Date.now()

  const mainUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const mainKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!mainUrl || !mainKey) {
    return NextResponse.json(
      { error: 'Missing main Supabase env vars' },
      { status: 500 },
    )
  }

  try {
    const main = createClient(mainUrl, mainKey)
    const grocery = getGroceryServiceClient()

    const rows: CompareRow[] = []
    for (const chain of CHAINS) {
      const gomaIds = GOMA_STORE_ID_ALIASES[chain] ?? [chain]
      const [gT, gS, oT, oS] = await Promise.all([
        countOffers(main, gomaIds, false),
        countOffers(main, gomaIds, true),
        countOffers(grocery, [chain], false),
        countOffers(grocery, [chain], true),
      ])
      rows.push({
        chain,
        coverage: CHAIN_COVERAGE[chain],
        goma_total: gT,
        goma_on_sale: gS,
        grocery_total: oT,
        grocery_on_sale: oS,
        delta_total: oT - gT,
        delta_on_sale: oS - gS,
      })
    }

    // Grand totals across ALL store_ids (not just our enumerated chains)
    const { count: gomaGrandTotal } = await main
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
    const { count: gomaGrandOnSale } = await main
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_on_sale', true)
    const { count: groceryGrandTotal } = await grocery
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
    const { count: groceryGrandOnSale } = await grocery
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_on_sale', true)

    const totals = {
      goma_total: rows.reduce((s, r) => s + r.goma_total, 0),
      goma_on_sale: rows.reduce((s, r) => s + r.goma_on_sale, 0),
      grocery_total: rows.reduce((s, r) => s + r.grocery_total, 0),
      grocery_on_sale: rows.reduce((s, r) => s + r.grocery_on_sale, 0),
    }

    const payload: CompareResponse = {
      generated_at: new Date().toISOString(),
      duration_ms: Date.now() - t0,
      rows,
      totals,
      goma_grand_total: gomaGrandTotal ?? 0,
      goma_grand_on_sale: gomaGrandOnSale ?? 0,
      grocery_grand_total: groceryGrandTotal ?? 0,
      grocery_grand_on_sale: groceryGrandOnSale ?? 0,
    }
    return NextResponse.json(payload, {
      headers: { 'cache-control': 'no-store' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
