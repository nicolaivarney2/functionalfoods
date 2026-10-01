import { getGroceryServiceClient } from '../../db/client'
import { retryGroceryDb } from '../../db/retry'
import { applyCatalogRetentionAfterFullSync } from '../../sync/catalog-retention'
import type { ProductOfferInsert, SyncLogInsert } from '../../types'
import { fetchNemligCatalog, type NemligCatalog } from './client'
import { mapNemligOffer, mapNemligProduct, NEMLIG_OFFER_SOURCE } from './mapper'
import type { NemligCatalogEntry } from './types'

const SYNC_LOG_SOURCE = 'nemlig-api' as const
const PRODUCT_BATCH_SIZE = 200
const STALE_RUNNING_MS = 60 * 60 * 1000
/** Retention (deaktivér forsvundne varer) kun når crawlet ser komplet ud. */
const MAX_FAILURE_RATIO = 0.01
const MIN_SITEMAP_COVERAGE = 0.9

export function isNemligEnabled(): boolean {
  return process.env.GROCERY_NEMLIG_DISABLED !== 'true'
}

export interface NemligSyncOptions {
  dryRun?: boolean
  maxProducts?: number
  /** Kun til tests/udvikling: begræns antal kategorisider og spring sitemap over. */
  maxPages?: number
  log?: (msg: string) => void
}

export interface NemligSyncResult {
  source: 'nemlig'
  status: 'success' | 'partial' | 'failed'
  productsProcessed: number
  productsCreated: number
  productsUpdated: number
  offersProcessed: number
  offersOnSale: number
  errorsCount: number
  errorMessage?: string
  durationMs: number
  syncLogId?: string
  sampleProductIds: string[]
  catalog?: Omit<NemligCatalog, 'entries' | 'failures'> & { failures: number }
  retention?: { offersSlept: number; productsDeactivated: number } | { skipped: string }
}

export function nemligCatalogLooksComplete(catalog: NemligCatalog): string | null {
  const calls = catalog.pages + catalog.groups + Math.max(catalog.sitemapIds - catalog.entries.length, 0)
  if (catalog.sitemapIds === 0) return 'sitemap ikke hentet'
  if (catalog.failures.length > Math.max(calls, 1) * MAX_FAILURE_RATIO) {
    return `${catalog.failures.length} fejlede kald`
  }
  if (catalog.entries.length < catalog.sitemapIds * MIN_SITEMAP_COVERAGE) {
    return `kun ${catalog.entries.length} af ${catalog.sitemapIds} sitemap-varer`
  }
  return null
}

export async function syncNemlig(options: NemligSyncOptions = {}): Promise<NemligSyncResult> {
  const startedAt = Date.now()
  const syncStartedAt = new Date(startedAt).toISOString()
  const log = options.log ?? (() => {})
  const supabase = options.dryRun ? null : getGroceryServiceClient()

  let productsProcessed = 0
  let productsCreated = 0
  let productsUpdated = 0
  let offersProcessed = 0
  let offersOnSale = 0
  let errorsCount = 0
  const sampleProductIds: string[] = []

  let syncLogId: string | undefined
  if (supabase) {
    const staleBefore = new Date(startedAt - STALE_RUNNING_MS).toISOString()
    await retryGroceryDb('abandon stale running Nemlig logs', async () => {
      const res = await supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          completed_at: syncStartedAt,
          error_message: 'Stale running — abandoned before new Nemlig sync',
          duration_ms: STALE_RUNNING_MS,
        })
        .eq('source', SYNC_LOG_SOURCE)
        .eq('status', 'running')
        .lt('started_at', staleBefore)
      if (res.error) throw new Error(res.error.message)
      return res
    })
    const initial: SyncLogInsert = {
      source: SYNC_LOG_SOURCE,
      status: 'running',
      started_at: syncStartedAt,
      metadata: { adapter: 'nemlig-webapi' },
    }
    const { data } = await retryGroceryDb('create Nemlig sync_log', async () => {
      const res = await supabase.from('sync_logs').insert(initial).select('id').single()
      if (res.error) throw new Error(res.error.message)
      return res
    })
    syncLogId = data.id
  }

  const finishLog = async (patch: Record<string, unknown>) => {
    if (!supabase || !syncLogId) return
    await supabase
      .from('sync_logs')
      .update({
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        products_processed: productsProcessed,
        products_created: productsCreated,
        products_updated: productsUpdated,
        offers_processed: offersProcessed,
        errors_count: errorsCount,
        ...patch,
      })
      .eq('id', syncLogId)
  }

  let catalog: NemligCatalog
  try {
    catalog = await fetchNemligCatalog({
      log,
      maxPages: options.maxPages,
      skipSitemap: Boolean(options.maxPages),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await finishLog({ status: 'failed', error_message: `Crawl: ${message}`.slice(0, 1000) })
    return {
      source: 'nemlig',
      status: 'failed',
      productsProcessed,
      productsCreated,
      productsUpdated,
      offersProcessed,
      offersOnSale,
      errorsCount: errorsCount + 1,
      errorMessage: message,
      durationMs: Date.now() - startedAt,
      syncLogId,
      sampleProductIds,
    }
  }

  errorsCount += catalog.failures.length
  for (const f of catalog.failures.slice(0, 10)) log(`fejl: ${f}`)
  const entries = options.maxProducts ? catalog.entries.slice(0, options.maxProducts) : catalog.entries
  const catalogSummary = {
    pages: catalog.pages,
    groups: catalog.groups,
    sitemapIds: catalog.sitemapIds,
    fetchedSingly: catalog.fetchedSingly,
    failures: catalog.failures.length,
  }
  log(`katalog: ${catalog.entries.length} varer (${JSON.stringify(catalogSummary)})`)

  const writeBatch = async (batch: NemligCatalogEntry[]) => {
    const products = batch.map((e) => mapNemligProduct(e, syncStartedAt))
    productsProcessed += products.length
    if (!supabase) {
      for (const e of batch) {
        const offer = mapNemligOffer(e.product, 'dry-run', syncStartedAt)
        if (!offer) continue
        offersProcessed++
        if (offer.is_on_sale) offersOnSale++
      }
      return
    }

    await retryGroceryDb('Nemlig product upsert', async () => {
      const res = await supabase
        .from('products')
        .upsert(products, { onConflict: 'source_chain,source_id', ignoreDuplicates: false })
      if (res.error) throw new Error(`Nemlig product upsert: ${res.error.message}`)
      return res
    })
    const { data } = await retryGroceryDb('Nemlig post-upsert select', async () => {
      const res = await supabase
        .from('products')
        .select('id, source_id, created_at, updated_at')
        .eq('source_chain', 'nemlig')
        .in('source_id', products.map((p) => p.source_id))
      if (res.error) throw new Error(`Nemlig post-upsert select: ${res.error.message}`)
      return res
    })

    const uuidBySourceId = new Map<string, string>()
    for (const row of data ?? []) {
      if (row.created_at === row.updated_at) productsCreated++
      else productsUpdated++
      if (sampleProductIds.length < 5) sampleProductIds.push(row.id as string)
      uuidBySourceId.set(row.source_id as string, row.id as string)
    }

    const offers: ProductOfferInsert[] = []
    batch.forEach((e, i) => {
      const uuid = uuidBySourceId.get(products[i].source_id)
      const offer = uuid ? mapNemligOffer(e.product, uuid, syncStartedAt) : null
      if (offer) offers.push(offer)
    })
    if (offers.length === 0) return
    await retryGroceryDb('Nemlig offer upsert', async () => {
      const res = await supabase
        .from('product_offers')
        .upsert(offers, { onConflict: 'product_id,store_id', ignoreDuplicates: false })
      if (res.error) throw new Error(`Nemlig offer upsert: ${res.error.message}`)
      return res
    })
    offersProcessed += offers.length
    offersOnSale += offers.filter((o) => o.is_on_sale).length
  }

  try {
    for (let i = 0; i < entries.length; i += PRODUCT_BATCH_SIZE) {
      await writeBatch(entries.slice(i, i + PRODUCT_BATCH_SIZE))
    }
  } catch (err) {
    errorsCount++
    const message = err instanceof Error ? err.message : String(err)
    await finishLog({ status: 'failed', error_message: message.slice(0, 1000) })
    return {
      source: 'nemlig',
      status: 'failed',
      productsProcessed,
      productsCreated,
      productsUpdated,
      offersProcessed,
      offersOnSale,
      errorsCount,
      errorMessage: message,
      durationMs: Date.now() - startedAt,
      syncLogId,
      sampleProductIds,
      catalog: catalogSummary,
    }
  }

  let retention: NemligSyncResult['retention']
  const incomplete = options.maxProducts || options.maxPages ? 'delvis kørsel' : nemligCatalogLooksComplete(catalog)
  if (incomplete) {
    retention = { skipped: incomplete }
  } else if (supabase) {
    try {
      retention = await applyCatalogRetentionAfterFullSync('nemlig', syncStartedAt, {
        deactivateMissingProducts: true,
      })
    } catch (err) {
      errorsCount++
      retention = { skipped: `fejl: ${err instanceof Error ? err.message : err}` }
    }
  } else {
    retention = { skipped: 'dry-run' }
  }
  log(`retention: ${JSON.stringify(retention)}`)

  const status: 'success' | 'partial' = errorsCount === 0 ? 'success' : 'partial'
  await finishLog({
    status,
    error_message: catalog.failures.length > 0 ? catalog.failures.slice(0, 5).join(' | ').slice(0, 1000) : null,
    metadata: { adapter: 'nemlig-webapi', offer_source: NEMLIG_OFFER_SOURCE, catalog: catalogSummary, retention, offers_on_sale: offersOnSale },
  })

  return {
    source: 'nemlig',
    status,
    productsProcessed,
    productsCreated,
    productsUpdated,
    offersProcessed,
    offersOnSale,
    errorsCount,
    durationMs: Date.now() - startedAt,
    syncLogId,
    sampleProductIds,
    catalog: catalogSummary,
    retention,
  }
}
