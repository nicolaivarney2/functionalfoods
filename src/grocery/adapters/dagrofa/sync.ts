import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getGroceryServiceClient } from '../../db/client'
import { retryGroceryDb } from '../../db/retry'
import type { ProductInsert, ProductOfferInsert, SyncLogInsert } from '../../types'
import { copenhagenDate } from '../lidl/sync'
import { DAGROFA_AVIS_CHAINS, type DagrofaAvisChain, type DagrofaAvisSource, type DagrofaChainId } from './chains'
import { fetchDagrofaAvis } from './client'
import {
  DAGROFA_AVIS_SOURCE_ID_PREFIX,
  mapDagrofaAvisOffer,
  mapDagrofaAvisProduct,
  selectDagrofaFoodItems,
} from './mapper'
import type { DagrofaAvis, DagrofaAvisItem, DagrofaNativeCategory } from './types'

const STALE_RUNNING_MS = 30 * 60 * 1000
const UPSERT_BATCH_SIZE = 200
const GTIN_LOOKUP_BATCH = 150
/** Kæder med fuldt katalog og ens EAN — bruges kun til at afgøre madvare/afdeling. */
const NATIVE_CATALOG_CHAINS = ['netto', 'foetex', 'bilka'] as const

export function dagrofaAvisDisabledMessage(chainId: DagrofaChainId): string {
  const chain = DAGROFA_AVIS_CHAINS[chainId]
  return `${chain.label}-avis sync er slået fra (${chain.disabledEnv}=true).`
}

export function isDagrofaAvisEnabled(chainId: DagrofaChainId): boolean {
  return process.env[DAGROFA_AVIS_CHAINS[chainId].disabledEnv] !== 'true'
}

export interface DagrofaAvisSyncOptions {
  dryRun?: boolean
  /** Skriv selvom avisen er uændret siden sidste succes. */
  force?: boolean
  maxProducts?: number
  now?: Date
  log?: (msg: string) => void
}

export interface DagrofaAvisSyncResult {
  source: DagrofaAvisSource
  status: 'success' | 'partial' | 'failed' | 'disabled'
  skippedUnchanged: boolean
  avis: { paperId: number; name: string; validFrom: string; validTo: string; products: number } | null
  productsProcessed: number
  productsCreated: number
  productsUpdated: number
  offersProcessed: number
  alcoholSkipped: number
  nonFoodSkipped: number
  noPriceSkipped: number
  nativeMatched: number
  errorsCount: number
  errorMessage?: string
  durationMs: number
  syncLogId?: string
  items?: DagrofaAvisItem[]
}

export function isDagrofaAvisActiveOn(avis: Pick<DagrofaAvis, 'validFrom' | 'validTo'>, day: string): boolean {
  return avis.validFrom <= day && day <= avis.validTo
}

export function dagrofaAvisFingerprint(avis: DagrofaAvis): string {
  const keys = avis.products.map((p) => `${p.productId}:${p.price ?? ''}`).sort()
  return createHash('sha256')
    .update(`${avis.paperId}|${avis.validFrom}|${avis.validTo}|${keys.join('|')}`)
    .digest('hex')
    .slice(0, 32)
}

/** Salling-katalogets afdeling for samme EAN (read-only). */
async function lookupNativeCategories(
  supabase: SupabaseClient,
  eans: string[],
): Promise<Map<string, DagrofaNativeCategory>> {
  const byEan = new Map<string, DagrofaNativeCategory>()
  for (let i = 0; i < eans.length; i += GTIN_LOOKUP_BATCH) {
    const { data } = await retryGroceryDb('Dagrofa native category lookup', async () => {
      const res = await supabase
        .from('products')
        .select('gtin, category_lvl0, category_lvl1')
        .in('gtin', eans.slice(i, i + GTIN_LOOKUP_BATCH))
        .in('source_chain', [...NATIVE_CATALOG_CHAINS])
        .not('category_lvl0', 'is', null)
      if (res.error) throw new Error(res.error.message)
      return res
    })
    for (const row of data ?? []) {
      const gtin = String(row.gtin)
      if (!byEan.has(gtin)) byEan.set(gtin, { lvl0: row.category_lvl0, lvl1: row.category_lvl1 })
    }
  }
  return byEan
}

function hasGroceryEnv(): boolean {
  return Boolean(process.env.GROCERY_SUPABASE_URL && process.env.GROCERY_SUPABASE_SECRET_KEY)
}

function emptyResult(chain: DagrofaAvisChain, startedAt: number): DagrofaAvisSyncResult {
  return {
    source: chain.source,
    status: 'success',
    skippedUnchanged: false,
    avis: null,
    productsProcessed: 0,
    productsCreated: 0,
    productsUpdated: 0,
    offersProcessed: 0,
    alcoholSkipped: 0,
    nonFoodSkipped: 0,
    noPriceSkipped: 0,
    nativeMatched: 0,
    errorsCount: 0,
    durationMs: Date.now() - startedAt,
  }
}

/** Kun avis-rækker (source <kæde>-avis, source_id avis-*) — Goma-rækker røres ikke. */
async function retireOldAvisRows(
  supabase: SupabaseClient,
  chain: DagrofaAvisChain,
  syncedAt: string,
): Promise<void> {
  await retryGroceryDb(`retire old ${chain.label} avis offers`, async () => {
    const res = await supabase
      .from('product_offers')
      .update({ is_on_sale: false, in_stock: false })
      .eq('store_id', chain.chain)
      .eq('source', chain.source)
      .lt('source_synced_at', syncedAt)
    if (res.error) throw new Error(res.error.message)
    return res
  })
  await retryGroceryDb(`retire old ${chain.label} avis products`, async () => {
    const res = await supabase
      .from('products')
      .update({ active: false })
      .eq('source_chain', chain.chain)
      .like('source_id', `${DAGROFA_AVIS_SOURCE_ID_PREFIX}%`)
      .lt('last_seen_at', syncedAt)
    if (res.error) throw new Error(res.error.message)
    return res
  })
}

export async function syncDagrofaAvis(
  chainId: DagrofaChainId,
  options: DagrofaAvisSyncOptions = {},
): Promise<DagrofaAvisSyncResult> {
  const chain = DAGROFA_AVIS_CHAINS[chainId]
  const startedAt = Date.now()
  const now = options.now ?? new Date(startedAt)
  const syncedAt = now.toISOString()
  const log = options.log ?? (() => {})
  const result = emptyResult(chain, startedAt)

  if (!isDagrofaAvisEnabled(chainId)) {
    return { ...result, status: 'disabled', errorMessage: dagrofaAvisDisabledMessage(chainId) }
  }

  const supabase = options.dryRun ? null : getGroceryServiceClient()
  // Dry-run læser stadig kataloget (ingen skrivning), hvis nøglerne findes.
  const reader = supabase ?? (hasGroceryEnv() ? getGroceryServiceClient() : null)
  let syncLogId: string | undefined

  const finishLog = async (patch: Record<string, unknown>) => {
    if (!supabase || !syncLogId) return
    await supabase
      .from('sync_logs')
      .update({
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        products_processed: result.productsProcessed,
        products_created: result.productsCreated,
        products_updated: result.productsUpdated,
        offers_processed: result.offersProcessed,
        errors_count: result.errorsCount,
        ...patch,
      })
      .eq('id', syncLogId)
  }

  try {
    if (supabase) {
      const staleBefore = new Date(startedAt - STALE_RUNNING_MS).toISOString()
      await retryGroceryDb(`abandon stale running ${chain.label} logs`, async () => {
        const res = await supabase
          .from('sync_logs')
          .update({
            status: 'failed',
            completed_at: syncedAt,
            error_message: `Stale running — abandoned before new ${chain.label} sync`,
          })
          .eq('source', chain.source)
          .eq('status', 'running')
          .lt('started_at', staleBefore)
        if (res.error) throw new Error(res.error.message)
        return res
      })
      const initial: SyncLogInsert = {
        source: chain.source,
        status: 'running',
        started_at: syncedAt,
        metadata: { adapter: chain.source },
      }
      const { data } = await retryGroceryDb(`create ${chain.label} sync_log`, async () => {
        const res = await supabase.from('sync_logs').insert(initial).select('id').single()
        if (res.error) throw new Error(res.error.message)
        return res
      })
      syncLogId = data.id as string
      result.syncLogId = syncLogId
    }

    const avis = await fetchDagrofaAvis(chain)
    if (!avis) throw new Error(`${chain.label}: avisens gyldighedsperiode blev ikke fundet`)
    result.avis = {
      paperId: avis.paperId,
      name: avis.name,
      validFrom: avis.validFrom,
      validTo: avis.validTo,
      products: avis.products.length,
    }
    log(`avis: ${avis.name} (${avis.validFrom} → ${avis.validTo}, ${avis.products.length} varer)`)

    const day = copenhagenDate(now)
    if (!isDagrofaAvisActiveOn(avis, day)) {
      log(`avisen gælder ikke i dag (${day}) — springer over`)
      await finishLog({
        status: 'success',
        metadata: { adapter: chain.source, notActive: true, avis: result.avis },
      })
      return { ...result, durationMs: Date.now() - startedAt }
    }

    const fingerprint = dagrofaAvisFingerprint(avis)
    if (supabase && !options.force) {
      const { data: last } = await supabase
        .from('sync_logs')
        .select('metadata')
        .eq('source', chain.source)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
      const lastFingerprint = (last?.[0]?.metadata as Record<string, unknown> | null)?.fingerprint
      if (lastFingerprint === fingerprint) {
        result.skippedUnchanged = true
        log('avis uændret siden sidste sync — springer over')
        await finishLog({
          status: 'success',
          metadata: { adapter: chain.source, fingerprint, skippedUnchanged: true, avis: result.avis },
        })
        return { ...result, durationMs: Date.now() - startedAt }
      }
    }

    const nativeByEan = reader
      ? await lookupNativeCategories(reader, avis.products.map((p) => String(p.productId)))
      : new Map<string, DagrofaNativeCategory>()
    if (!reader) log('ingen fooddata-nøgler — madvare-filter kører kun på navne-regler')

    const selection = selectDagrofaFoodItems(avis, nativeByEan)
    let foodItems = selection.items
    if (options.maxProducts) foodItems = foodItems.slice(0, options.maxProducts)
    result.alcoholSkipped = selection.alcoholSkipped
    result.nonFoodSkipped = selection.nonFoodSkipped
    result.noPriceSkipped = selection.noPriceSkipped
    result.nativeMatched = selection.nativeMatched
    result.productsProcessed = foodItems.length
    if (options.dryRun) result.items = foodItems
    log(
      `madvarer: ${foodItems.length} · alkohol: ${selection.alcoholSkipped} · non-food: ${selection.nonFoodSkipped} · uden pris: ${selection.noPriceSkipped} · katalog-match: ${selection.nativeMatched}`,
    )

    if (supabase && foodItems.length > 0) {
      const productRows: ProductInsert[] = foodItems.map((item) => mapDagrofaAvisProduct(item, syncedAt))
      for (let i = 0; i < productRows.length; i += UPSERT_BATCH_SIZE) {
        const slice = productRows.slice(i, i + UPSERT_BATCH_SIZE)
        await retryGroceryDb(`${chain.label} product upsert`, async () => {
          const res = await supabase
            .from('products')
            .upsert(slice, { onConflict: 'source_chain,source_id', ignoreDuplicates: false })
          if (res.error) throw new Error(res.error.message)
          return res
        })
      }

      const idBySourceId = new Map<string, string>()
      const sourceIds = productRows.map((p) => p.source_id)
      for (let i = 0; i < sourceIds.length; i += UPSERT_BATCH_SIZE) {
        const { data } = await retryGroceryDb(`${chain.label} product select`, async () => {
          const res = await supabase
            .from('products')
            .select('id, source_id, created_at, updated_at')
            .eq('source_chain', chain.chain)
            .in('source_id', sourceIds.slice(i, i + UPSERT_BATCH_SIZE))
          if (res.error) throw new Error(res.error.message)
          return res
        })
        for (const row of data ?? []) {
          if (row.created_at === row.updated_at) result.productsCreated++
          else result.productsUpdated++
          idBySourceId.set(String(row.source_id), String(row.id))
        }
      }

      const offerRows: ProductOfferInsert[] = []
      for (const [idx, item] of foodItems.entries()) {
        const productUuid = idBySourceId.get(productRows[idx].source_id)
        if (!productUuid) continue
        const offer = mapDagrofaAvisOffer(item, productUuid, syncedAt)
        if (offer) offerRows.push(offer)
      }
      for (let i = 0; i < offerRows.length; i += UPSERT_BATCH_SIZE) {
        const slice = offerRows.slice(i, i + UPSERT_BATCH_SIZE)
        await retryGroceryDb(`${chain.label} offer upsert`, async () => {
          const res = await supabase
            .from('product_offers')
            .upsert(slice, { onConflict: 'product_id,store_id', ignoreDuplicates: false })
          if (res.error) throw new Error(res.error.message)
          return res
        })
        result.offersProcessed += slice.length
      }

      if (!options.maxProducts) await retireOldAvisRows(supabase, chain, syncedAt)
    }

    result.status = 'success'
    await finishLog({
      status: result.status,
      metadata: {
        adapter: chain.source,
        fingerprint,
        avis: result.avis,
        alcoholSkipped: result.alcoholSkipped,
        nonFoodSkipped: result.nonFoodSkipped,
        noPriceSkipped: result.noPriceSkipped,
        nativeMatched: result.nativeMatched,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    result.status = 'failed'
    result.errorsCount++
    result.errorMessage = message
    await finishLog({ status: 'failed', error_message: message.slice(0, 1000) })
  }

  return { ...result, durationMs: Date.now() - startedAt }
}
