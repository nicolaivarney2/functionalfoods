/**
 * Tjek sync orchestrator.
 *
 * Iterates over the whitelisted dealer set, fetches each dealer's active
 * offers, and upserts them into `products` + `product_offers` in batches.
 * Writes a sync_logs row tracking the run.
 *
 * Default behavior excludes chains that have a primary-source catalog
 * adapter (Salling Algolia, REMA API). Override with `includePrimary: true`
 * if you want to use Tjek as a secondary signal for those chains too.
 *
 * Dry-run mode bypasses ALL DB writes — useful for the explorer view to
 * preview what would happen without committing anything.
 */

import { getGroceryServiceClient } from '../../db/client'
import { sleepStaleOffersForChain } from '../../sync/catalog-retention'
import type { ProductInsert, ProductOfferInsert, SyncLogInsert } from '../../types'
import { TjekClient, TjekAutoPausedError, TjekDisabledError } from './client'
import {
  mapTjekOfferToOffer,
  mapTjekOfferToProduct,
  pickTjekOfferImageUrl,
  resolveChain,
} from './mapper'
import {
  CHAIN_TO_TJEK_DEALER,
  CHAINS_WITH_PRIMARY_CATALOG,
  TJEK_DEALER_TO_CHAIN,
  type TjekOffer,
} from './types'
import type { SourceChain } from '../../types'

const PRODUCT_BATCH_SIZE = 200
const OFFER_BATCH_SIZE = 200

export interface TjekSyncOptions {
  /** Don't write to DB; just count + return preview. */
  dryRun?: boolean
  /** Stop after N offers across the entire run. */
  maxOffers?: number
  /** Stop each individual dealer after N offers. Useful for "sample all chains" views. */
  maxOffersPerDealer?: number
  /** Limit which chains to sync. Default = all in TJEK_DEALER_TO_CHAIN. */
  chains?: SourceChain[]
  /**
   * If true, also sync chains that already have a primary catalog
   * (Salling, REMA). Default false to keep primary catalogs canonical.
   */
  includePrimary?: boolean
  /** Override the TjekClient's sleep window for fast local tests. */
  minSleepMs?: number
  maxSleepMs?: number
  /** Collect mapped offers without DB writes — for explorer preview. */
  collectPreview?: boolean
}

export interface TjekSyncPreviewItem {
  chain: SourceChain
  offerId: string
  heading: string
  description: string | null
  priceKr: number
  preKr: number | null
  discountPct: number | null
  runFrom: string
  runTill: string
  amount: number | null
  unit: string | null
  imageUrl: string | null
  webshopUrl: string | null
}

export interface TjekSyncResult {
  source: 'tjek:offers'
  status: 'success' | 'partial' | 'failed' | 'disabled' | 'paused'
  dealersProcessed: number
  offersProcessed: number
  productsCreated: number
  productsUpdated: number
  offersUpserted: number
  errorsCount: number
  errorMessage?: string
  durationMs: number
  syncLogId?: string
  /** Only populated when `collectPreview` is true. */
  preview?: TjekSyncPreviewItem[]
}

export async function syncTjek(options: TjekSyncOptions = {}): Promise<TjekSyncResult> {
  const startedAt = Date.now()
  const syncStartedAt = new Date(startedAt).toISOString()
  const dryRun = options.dryRun ?? false
  const includePrimary = options.includePrimary ?? false
  const collectPreview = options.collectPreview ?? false
  const runRetention =
    !dryRun && !options.maxOffers && !options.maxOffersPerDealer

  // Resolve target chains → dealer IDs.
  const requestedChains =
    options.chains ?? (Object.values(TJEK_DEALER_TO_CHAIN) as SourceChain[])
  const targetDealers: Array<{ chain: SourceChain; dealerId: string }> = []
  for (const chain of requestedChains) {
    if (!includePrimary && CHAINS_WITH_PRIMARY_CATALOG.has(chain)) continue
    const dealerId = CHAIN_TO_TJEK_DEALER[chain]
    if (!dealerId) continue
    targetDealers.push({ chain, dealerId })
  }

  if (targetDealers.length === 0) {
    return {
      source: 'tjek:offers',
      status: 'success',
      dealersProcessed: 0,
      offersProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      offersUpserted: 0,
      errorsCount: 0,
      durationMs: Date.now() - startedAt,
      preview: collectPreview ? [] : undefined,
    }
  }

  // Kill-switch check before opening any state.
  if (process.env.GROCERY_TJEK_DISABLED === 'true') {
    return {
      source: 'tjek:offers',
      status: 'disabled',
      dealersProcessed: 0,
      offersProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      offersUpserted: 0,
      errorsCount: 0,
      durationMs: Date.now() - startedAt,
      errorMessage: 'Tjek sync disabled via GROCERY_TJEK_DISABLED=true',
    }
  }

  const supabase = dryRun ? null : getGroceryServiceClient()
  let syncLogId: string | undefined

  if (supabase) {
    const initial: SyncLogInsert = {
      source: 'tjek:offers',
      status: 'running',
      started_at: new Date(startedAt).toISOString(),
      metadata: {
        adapter: 'tjek',
        chains: targetDealers.map((d) => d.chain),
        includePrimary,
      },
    }
    const { data, error } = await supabase
      .from('sync_logs')
      .insert(initial)
      .select('id')
      .single()
    if (error) {
      return failure(startedAt, `sync_logs insert failed: ${error.message}`)
    }
    syncLogId = data.id
  }

  const client = new TjekClient({
    minSleepMs: options.minSleepMs,
    maxSleepMs: options.maxSleepMs,
  })

  const productBuffer: ProductInsert[] = []
  const offerBuffer: TjekOffer[] = []
  const preview: TjekSyncPreviewItem[] = []

  let dealersProcessed = 0
  let offersProcessed = 0
  let productsCreated = 0
  let productsUpdated = 0
  let offersUpserted = 0
  let errorsCount = 0
  let pausedEarly = false

  const flush = async (chain: SourceChain): Promise<void> => {
    if (productBuffer.length === 0) return

    if (!supabase) {
      productBuffer.length = 0
      offerBuffer.length = 0
      return
    }

    const { error: upsertErr } = await supabase
      .from('products')
      .upsert(productBuffer, {
        onConflict: 'source_chain,source_id',
        ignoreDuplicates: false,
      })
    if (upsertErr) {
      errorsCount += productBuffer.length
      throw new Error(`Tjek product upsert failed: ${upsertErr.message}`)
    }

    const sourceIds = productBuffer.map((p) => p.source_id)
    const { data, error: selectErr } = await supabase
      .from('products')
      .select('id, source_id, created_at, updated_at')
      .eq('source_chain', chain)
      .in('source_id', sourceIds)
    if (selectErr) {
      errorsCount += productBuffer.length
      throw new Error(`Tjek post-upsert select failed: ${selectErr.message}`)
    }

    const idBySourceId = new Map<string, string>()
    for (const row of data ?? []) {
      if (row.created_at === row.updated_at) productsCreated++
      else productsUpdated++
      idBySourceId.set(row.source_id as string, row.id as string)
    }

    const offerInserts: ProductOfferInsert[] = []
    for (const offer of offerBuffer) {
      const productId = idBySourceId.get(offer.id)
      if (!productId) continue
      const mapped = mapTjekOfferToOffer(offer, productId)
      if (mapped) offerInserts.push(mapped)
    }

    for (let i = 0; i < offerInserts.length; i += OFFER_BATCH_SIZE) {
      const slice = offerInserts.slice(i, i + OFFER_BATCH_SIZE)
      const { error: offerErr } = await supabase
        .from('product_offers')
        .upsert(slice, { onConflict: 'product_id,store_id', ignoreDuplicates: false })
      if (offerErr) {
        errorsCount += slice.length
        throw new Error(`Tjek offer upsert failed: ${offerErr.message}`)
      }
      offersUpserted += slice.length
    }

    productBuffer.length = 0
    offerBuffer.length = 0
  }

  try {
    for (const { chain, dealerId } of targetDealers) {
      dealersProcessed++
      let perDealerCount = 0

      for await (const offer of client.iterateDealerOffers(dealerId)) {
        if (options.maxOffers && offersProcessed >= options.maxOffers) break
        if (
          options.maxOffersPerDealer &&
          perDealerCount >= options.maxOffersPerDealer
        )
          break

        // Defensive: should never happen since we resolved earlier.
        if (resolveChain(offer.dealer_id) !== chain) continue

        const product = mapTjekOfferToProduct(offer)
        if (!product) continue

        productBuffer.push(product)
        offerBuffer.push(offer)
        offersProcessed++
        perDealerCount++

        if (collectPreview && preview.length < 2000) {
          preview.push(buildPreviewItem(chain, offer))
        }

        if (productBuffer.length >= PRODUCT_BATCH_SIZE) {
          await flush(chain)
        }
      }
      // Per-chain flush so rows land grouped by chain.
      await flush(chain)
      if (runRetention) {
        try {
          await sleepStaleOffersForChain(chain, syncStartedAt)
        } catch (retentionErr) {
          errorsCount++
          const msg =
            retentionErr instanceof Error
              ? retentionErr.message
              : String(retentionErr)
          if (supabase && syncLogId) {
            await supabase
              .from('sync_logs')
              .update({
                error_message: `Retention(${chain}): ${msg}`.slice(0, 1000),
              })
              .eq('id', syncLogId)
          }
        }
      }
      if (options.maxOffers && offersProcessed >= options.maxOffers) break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isPaused = err instanceof TjekAutoPausedError
    const isDisabled = err instanceof TjekDisabledError
    pausedEarly = isPaused

    if (supabase && syncLogId) {
      await supabase
        .from('sync_logs')
        .update({
          status: isPaused || isDisabled ? 'failed' : 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          products_processed: offersProcessed,
          products_created: productsCreated,
          products_updated: productsUpdated,
          offers_processed: offersUpserted,
          errors_count: errorsCount,
          error_message: message.slice(0, 1000),
        })
        .eq('id', syncLogId)
    }
    return {
      source: 'tjek:offers',
      status: isDisabled ? 'disabled' : isPaused ? 'paused' : 'failed',
      dealersProcessed,
      offersProcessed,
      productsCreated,
      productsUpdated,
      offersUpserted,
      errorsCount,
      errorMessage: message,
      durationMs: Date.now() - startedAt,
      syncLogId,
      preview: collectPreview ? preview : undefined,
    }
  }

  const status: 'success' | 'partial' = errorsCount === 0 ? 'success' : 'partial'

  if (supabase && syncLogId) {
    await supabase
      .from('sync_logs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        products_processed: offersProcessed,
        products_created: productsCreated,
        products_updated: productsUpdated,
        offers_processed: offersUpserted,
        errors_count: errorsCount,
      })
      .eq('id', syncLogId)
  }

  return {
    source: 'tjek:offers',
    status,
    dealersProcessed,
    offersProcessed,
    productsCreated,
    productsUpdated,
    offersUpserted,
    errorsCount,
    durationMs: Date.now() - startedAt,
    syncLogId,
    preview: collectPreview ? preview : undefined,
  }
  void pausedEarly
}

function buildPreviewItem(chain: SourceChain, offer: TjekOffer): TjekSyncPreviewItem {
  const imageUrl = pickTjekOfferImageUrl(offer.images)
  return {
    chain,
    offerId: offer.id,
    heading: offer.heading,
    description: offer.description?.trim() || null,
    priceKr: offer.pricing.price,
    preKr: offer.pricing.pre_price ?? null,
    discountPct:
      offer.pricing.pre_price && offer.pricing.pre_price > offer.pricing.price
        ? Number(
            (
              ((offer.pricing.pre_price - offer.pricing.price) /
                offer.pricing.pre_price) *
              100
            ).toFixed(1),
          )
        : null,
    runFrom: offer.run_from,
    runTill: offer.run_till,
    amount: offer.quantity?.size?.from ?? null,
    unit: offer.quantity?.unit?.symbol ?? null,
    imageUrl,
    webshopUrl: offer.links?.webshop ?? null,
  }
}

function failure(startedAt: number, message: string): TjekSyncResult {
  return {
    source: 'tjek:offers',
    status: 'failed',
    dealersProcessed: 0,
    offersProcessed: 0,
    productsCreated: 0,
    productsUpdated: 0,
    offersUpserted: 0,
    errorsCount: 1,
    errorMessage: message,
    durationMs: Date.now() - startedAt,
  }
}
