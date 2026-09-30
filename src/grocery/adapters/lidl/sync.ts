import { createHash } from 'node:crypto'
import { getGroceryServiceClient } from '../../db/client'
import { retryGroceryDb } from '../../db/retry'
import type { ProductInsert, ProductOfferInsert, SyncLogInsert } from '../../types'
import {
  fetchLidlFlyer,
  fetchLidlProductDetails,
  listLidlFlyerRefs,
  type LidlFlyerRef,
} from './client'
import {
  isLidlFoodProduct,
  LIDL_AVIS_SOURCE,
  LIDL_AVIS_SOURCE_ID_PREFIX,
  mapLidlAvisOffer,
  mapLidlAvisProduct,
  resolveLidlPriceCents,
} from './mapper'
import type { LidlAvisItem, LidlFlyer, LidlFlyerProduct } from './types'

const STALE_RUNNING_MS = 30 * 60 * 1000
/** Høflig takt mod lidl.dk — én produktside ad gangen. */
const DETAIL_DELAY_MS = 400
const UPSERT_BATCH_SIZE = 200

export const LIDL_AVIS_DISABLED_MESSAGE =
  'Lidl-avis sync er slået fra (GROCERY_LIDL_AVIS_DISABLED=true).'

export function isLidlAvisEnabled(): boolean {
  return process.env.GROCERY_LIDL_AVIS_DISABLED !== 'true'
}

export interface LidlAvisSyncOptions {
  dryRun?: boolean
  /** Hent produktsider selv om avisen er uændret siden sidste succes. */
  force?: boolean
  maxProducts?: number
  now?: Date
  log?: (msg: string) => void
}

export interface LidlAvisSyncResult {
  source: 'lidl-avis'
  status: 'success' | 'partial' | 'failed' | 'disabled'
  skippedUnchanged: boolean
  flyers: Array<{ slug: string; title: string; name: string; products: number }>
  productsProcessed: number
  productsCreated: number
  productsUpdated: number
  offersProcessed: number
  nonFoodSkipped: number
  /** Varer i avisen uden pris (fx "flere varianter"). */
  noPriceSkipped: number
  detailErrors: number
  errorsCount: number
  errorMessage?: string
  durationMs: number
  syncLogId?: string
  items?: LidlAvisItem[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function copenhagenDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function isFlyerActiveOn(flyer: Pick<LidlFlyer, 'offerStartDate' | 'offerEndDate'>, day: string): boolean {
  return flyer.offerStartDate <= day && day <= flyer.offerEndDate
}

function flyerProducts(flyer: LidlFlyer): LidlFlyerProduct[] {
  if (!flyer.products) return []
  return Array.isArray(flyer.products) ? flyer.products : Object.values(flyer.products)
}

/**
 * Varer fra aktive aviser. Samme vare i to aviser → nyeste avis vinder
 * (product_offers er unik på product_id + store_id).
 */
export function pickActiveAvisItems(
  flyers: Array<{ ref: LidlFlyerRef; flyer: LidlFlyer }>,
  day: string,
): LidlAvisItem[] {
  const byProduct = new Map<string, LidlAvisItem>()
  const active = flyers
    .filter(({ flyer }) => isFlyerActiveOn(flyer, day))
    .sort((a, b) => a.flyer.offerStartDate.localeCompare(b.flyer.offerStartDate))
  for (const { ref, flyer } of active) {
    for (const product of flyerProducts(flyer)) {
      if (!product.productId || !product.title?.trim()) continue
      byProduct.set(String(product.productId), {
        flyer: {
          id: flyer.id,
          name: flyer.name,
          title: flyer.title,
          offerStartDate: flyer.offerStartDate,
          offerEndDate: flyer.offerEndDate,
          slug: ref.slug,
          url: ref.url,
        },
        product: { ...product, productId: String(product.productId) },
        details: null,
      })
    }
  }
  return [...byProduct.values()]
}

export function avisFingerprint(items: LidlAvisItem[]): string {
  const keys = items
    .map((i) => `${i.flyer.id}:${i.product.productId}:${i.product.price ?? ''}`)
    .sort()
  return createHash('sha256').update(keys.join('|')).digest('hex').slice(0, 32)
}

function emptyResult(startedAt: number): LidlAvisSyncResult {
  return {
    source: 'lidl-avis',
    status: 'success',
    skippedUnchanged: false,
    flyers: [],
    productsProcessed: 0,
    productsCreated: 0,
    productsUpdated: 0,
    offersProcessed: 0,
    nonFoodSkipped: 0,
    noPriceSkipped: 0,
    detailErrors: 0,
    errorsCount: 0,
    durationMs: Date.now() - startedAt,
  }
}

/** Kun avis-rækker (source lidl-avis, source_id avis-*) — Goma-rækker for Lidl røres ikke. */
async function retireOldAvisRows(
  supabase: ReturnType<typeof getGroceryServiceClient>,
  syncedAt: string,
): Promise<void> {
  await retryGroceryDb('retire old Lidl avis offers', async () => {
    const res = await supabase
      .from('product_offers')
      .update({ is_on_sale: false, in_stock: false })
      .eq('store_id', 'lidl')
      .eq('source', LIDL_AVIS_SOURCE)
      .lt('source_synced_at', syncedAt)
    if (res.error) throw new Error(res.error.message)
    return res
  })
  await retryGroceryDb('retire old Lidl avis products', async () => {
    const res = await supabase
      .from('products')
      .update({ active: false })
      .eq('source_chain', 'lidl')
      .like('source_id', `${LIDL_AVIS_SOURCE_ID_PREFIX}%`)
      .lt('last_seen_at', syncedAt)
    if (res.error) throw new Error(res.error.message)
    return res
  })
}

export async function syncLidlAvis(
  options: LidlAvisSyncOptions = {},
): Promise<LidlAvisSyncResult> {
  const startedAt = Date.now()
  const now = options.now ?? new Date(startedAt)
  const syncedAt = now.toISOString()
  const log = options.log ?? (() => {})
  const result = emptyResult(startedAt)

  if (!isLidlAvisEnabled()) {
    return { ...result, status: 'disabled', errorMessage: LIDL_AVIS_DISABLED_MESSAGE }
  }

  const supabase = options.dryRun ? null : getGroceryServiceClient()
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
      await retryGroceryDb('abandon stale running Lidl logs', async () => {
        const res = await supabase
          .from('sync_logs')
          .update({
            status: 'failed',
            completed_at: syncedAt,
            error_message: 'Stale running — abandoned before new Lidl sync',
          })
          .eq('source', LIDL_AVIS_SOURCE)
          .eq('status', 'running')
          .lt('started_at', staleBefore)
        if (res.error) throw new Error(res.error.message)
        return res
      })
      const initial: SyncLogInsert = {
        source: LIDL_AVIS_SOURCE,
        status: 'running',
        started_at: syncedAt,
        metadata: { adapter: 'lidl-avis' },
      }
      const { data } = await retryGroceryDb('create Lidl sync_log', async () => {
        const res = await supabase.from('sync_logs').insert(initial).select('id').single()
        if (res.error) throw new Error(res.error.message)
        return res
      })
      syncLogId = data.id as string
      result.syncLogId = syncLogId
    }

    const refs = await listLidlFlyerRefs()
    const flyers: Array<{ ref: LidlFlyerRef; flyer: LidlFlyer }> = []
    for (const ref of refs) {
      const flyer = await fetchLidlFlyer(ref)
      if (flyer) flyers.push({ ref, flyer })
    }
    const day = copenhagenDate(now)
    let items = pickActiveAvisItems(flyers, day)
    if (options.maxProducts) items = items.slice(0, options.maxProducts)
    result.flyers = flyers
      .filter(({ flyer }) => isFlyerActiveOn(flyer, day))
      .map(({ ref, flyer }) => ({
        slug: ref.slug,
        title: flyer.title,
        name: flyer.name,
        products: flyerProducts(flyer).length,
      }))
    log(`aktive aviser: ${result.flyers.map((f) => `${f.title} (${f.name}, ${f.products})`).join(' · ') || 'ingen'}`)

    const fingerprint = avisFingerprint(items)
    if (supabase && !options.force && items.length > 0) {
      const { data: last } = await supabase
        .from('sync_logs')
        .select('metadata')
        .eq('source', LIDL_AVIS_SOURCE)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
      const lastFingerprint = (last?.[0]?.metadata as Record<string, unknown> | null)?.fingerprint
      if (lastFingerprint === fingerprint) {
        result.skippedUnchanged = true
        log('avis uændret siden sidste sync — springer over')
        await finishLog({
          status: 'success',
          metadata: { adapter: 'lidl-avis', fingerprint, skippedUnchanged: true, flyers: result.flyers },
        })
        return { ...result, durationMs: Date.now() - startedAt }
      }
    }

    const foodItems: LidlAvisItem[] = []
    for (const [i, item] of items.entries()) {
      if (!isLidlFoodProduct(item.product, null)) {
        result.nonFoodSkipped++
        continue
      }
      try {
        item.details = await fetchLidlProductDetails(item.product.canonicalUrl, item.product.productId)
        if (!item.details) result.detailErrors++
      } catch (err) {
        result.detailErrors++
        log(`  produktside fejlede ${item.product.productId}: ${err instanceof Error ? err.message : err}`)
      }
      if (!isLidlFoodProduct(item.product, item.details)) result.nonFoodSkipped++
      else if (resolveLidlPriceCents(item) == null) result.noPriceSkipped++
      else foodItems.push(item)
      if (i < items.length - 1) await sleep(DETAIL_DELAY_MS)
    }
    result.productsProcessed = foodItems.length
    if (options.dryRun) result.items = foodItems
    log(`madvarer: ${foodItems.length} · sorteret fra (non-food/alkohol): ${result.nonFoodSkipped} · uden pris: ${result.noPriceSkipped} · produktside-fejl: ${result.detailErrors}`)

    if (supabase && foodItems.length > 0) {
      const productRows: ProductInsert[] = foodItems.map((item) => mapLidlAvisProduct(item, syncedAt))
      for (let i = 0; i < productRows.length; i += UPSERT_BATCH_SIZE) {
        const slice = productRows.slice(i, i + UPSERT_BATCH_SIZE)
        await retryGroceryDb('Lidl product upsert', async () => {
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
        const { data } = await retryGroceryDb('Lidl product select', async () => {
          const res = await supabase
            .from('products')
            .select('id, source_id, created_at, updated_at')
            .eq('source_chain', 'lidl')
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
        const offer = mapLidlAvisOffer(item, productUuid, syncedAt)
        if (offer) offerRows.push(offer)
      }
      for (let i = 0; i < offerRows.length; i += UPSERT_BATCH_SIZE) {
        const slice = offerRows.slice(i, i + UPSERT_BATCH_SIZE)
        await retryGroceryDb('Lidl offer upsert', async () => {
          const res = await supabase
            .from('product_offers')
            .upsert(slice, { onConflict: 'product_id,store_id', ignoreDuplicates: false })
          if (res.error) throw new Error(res.error.message)
          return res
        })
        result.offersProcessed += slice.length
      }

      if (!options.maxProducts) await retireOldAvisRows(supabase, syncedAt)
    }

    result.status = result.detailErrors > 0 ? 'partial' : 'success'
    await finishLog({
      status: result.status,
      metadata: {
        adapter: 'lidl-avis',
        fingerprint,
        flyers: result.flyers,
        nonFoodSkipped: result.nonFoodSkipped,
        noPriceSkipped: result.noPriceSkipped,
        detailErrors: result.detailErrors,
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
