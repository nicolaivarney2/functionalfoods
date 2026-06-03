import { getGroceryServiceClient } from '../../db/client'
import { applyCatalogRetentionAfterFullSync } from '../../sync/catalog-retention'
import type { ProductInsert, ProductOfferInsert, SyncLogInsert, SourceChain } from '../../types'
import { iterateAllProducts } from './client'
import { mapHitToChainOffer, mapHitToProduct } from './mapper'
import type { SallingAlgoliaHit, SallingChain } from './types'

const CHAIN_TO_SOURCE: Record<SallingChain, SourceChain> = {
  netto: 'netto',
  bilka: 'bilka',
  foetex: 'foetex',
}

const PRODUCT_BATCH_SIZE = 200
const OFFER_BATCH_SIZE = 200

export interface SyncOptions {
  /** Skip writing to DB - just count/return what we'd sync. Useful for dry-run. */
  dryRun?: boolean
  /** Limit total products synced. Useful for proof-of-concept runs. */
  maxProducts?: number
  /** Hits per Algolia page. Default 1000. */
  hitsPerPage?: number
  /** Optional filter (e.g. only on-sale items). */
  filters?: string
}

export interface SyncResult {
  source: string
  status: 'success' | 'partial' | 'failed'
  productsProcessed: number
  productsCreated: number
  productsUpdated: number
  offersProcessed: number
  errorsCount: number
  errorMessage?: string
  durationMs: number
  syncLogId?: string
  sampleProductIds: string[]
}

export async function syncSallingChain(
  chain: SallingChain,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const source = `salling-algolia:${chain}` as const
  const startedAt = Date.now()
  const syncStartedAt = new Date(startedAt).toISOString()
  const supabase = options.dryRun ? null : getGroceryServiceClient()
  const runRetention = !options.dryRun && !options.maxProducts

  let syncLogId: string | undefined
  if (supabase) {
    const initial: SyncLogInsert = {
      source,
      status: 'running',
      started_at: new Date(startedAt).toISOString(),
    }
    const { data, error } = await supabase
      .from('sync_logs')
      .insert(initial)
      .select('id')
      .single()
    if (error) {
      return failureResult(source, startedAt, `Failed to create sync_log: ${error.message}`)
    }
    syncLogId = data.id
  }

  const productBuffer: ProductInsert[] = []
  const hitBuffer: SallingAlgoliaHit[] = []
  let productsProcessed = 0
  let productsCreated = 0
  let productsUpdated = 0
  let offersProcessed = 0
  let errorsCount = 0
  const sampleProductIds: string[] = []

  const flushProducts = async (): Promise<void> => {
    if (productBuffer.length === 0) return
    if (!supabase) {
      productBuffer.length = 0
      hitBuffer.length = 0
      return
    }

    // Upsert without returning rows (minimal payload, much faster).
    const { error } = await supabase
      .from('products')
      .upsert(productBuffer, {
        onConflict: 'source_chain,source_id',
        ignoreDuplicates: false,
      })

    if (error) {
      errorsCount += productBuffer.length
      throw new Error(`Product upsert failed: ${error.message}`)
    }

    // Fetch the ids and timestamps separately. This costs an extra round-trip
    // but the SELECT is bounded by source_id IN (...) so it stays small.
    const sourceIds = productBuffer.map((p) => p.source_id)
    const { data, error: selectError } = await supabase
      .from('products')
      .select('id, source_id, created_at, updated_at')
      .eq('source_chain', productBuffer[0].source_chain)
      .in('source_id', sourceIds)

    if (selectError) {
      errorsCount += productBuffer.length
      throw new Error(`Post-upsert select failed: ${selectError.message}`)
    }

    for (const row of data ?? []) {
      if (row.created_at === row.updated_at) productsCreated++
      else productsUpdated++
      if (sampleProductIds.length < 5) sampleProductIds.push(row.id as string)
    }

    const idBySourceId = new Map<string, string>()
    for (const row of data ?? []) {
      idBySourceId.set(row.source_id as string, row.id as string)
    }

    const offerBuffer: ProductOfferInsert[] = []
    for (const hit of hitBuffer) {
      const productId = idBySourceId.get(hit.objectID)
      if (!productId) continue
      const offer = mapHitToChainOffer(chain, hit, productId)
      if (offer) offerBuffer.push(offer)
    }

    for (let i = 0; i < offerBuffer.length; i += OFFER_BATCH_SIZE) {
      const slice = offerBuffer.slice(i, i + OFFER_BATCH_SIZE)
      const { error: offerError } = await supabase
        .from('product_offers')
        .upsert(slice, { onConflict: 'product_id,store_id', ignoreDuplicates: false })
      if (offerError) {
        errorsCount += slice.length
        throw new Error(`Offer upsert failed: ${offerError.message}`)
      }
      offersProcessed += slice.length
    }

    productBuffer.length = 0
    hitBuffer.length = 0
  }

  try {
    for await (const hit of iterateAllProducts(chain, {
      hitsPerPage: options.hitsPerPage,
      filters: options.filters,
    })) {
      if (options.maxProducts && productsProcessed >= options.maxProducts) break

      const product = mapHitToProduct(chain, hit)
      productBuffer.push(product)
      hitBuffer.push(hit)
      productsProcessed++

      if (productBuffer.length >= PRODUCT_BATCH_SIZE) {
        await flushProducts()
      }
    }
    await flushProducts()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (supabase && syncLogId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          products_processed: productsProcessed,
          products_created: productsCreated,
          products_updated: productsUpdated,
          offers_processed: offersProcessed,
          errors_count: errorsCount,
          error_message: message.slice(0, 1000),
        })
        .eq('id', syncLogId)
    }
    return {
      source,
      status: 'failed',
      productsProcessed,
      productsCreated,
      productsUpdated,
      offersProcessed,
      errorsCount,
      errorMessage: message,
      durationMs: Date.now() - startedAt,
      syncLogId,
      sampleProductIds,
    }
  }

  const status: 'success' | 'partial' = errorsCount === 0 ? 'success' : 'partial'

  if (runRetention && status !== 'failed') {
    try {
      await applyCatalogRetentionAfterFullSync(CHAIN_TO_SOURCE[chain], syncStartedAt, {
        deactivateMissingProducts: true,
      })
    } catch (retentionErr) {
      errorsCount++
      const msg =
        retentionErr instanceof Error ? retentionErr.message : String(retentionErr)
      if (supabase && syncLogId) {
        await supabase
          .from('sync_logs')
          .update({
            error_message: `Retention: ${msg}`.slice(0, 1000),
          })
          .eq('id', syncLogId)
      }
    }
  }

  if (supabase && syncLogId) {
    await supabase
      .from('sync_logs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        products_processed: productsProcessed,
        products_created: productsCreated,
        products_updated: productsUpdated,
        offers_processed: offersProcessed,
        errors_count: errorsCount,
      })
      .eq('id', syncLogId)
  }

  return {
    source,
    status,
    productsProcessed,
    productsCreated,
    productsUpdated,
    offersProcessed,
    errorsCount,
    durationMs: Date.now() - startedAt,
    syncLogId,
    sampleProductIds,
  }
}

function failureResult(source: string, startedAt: number, message: string): SyncResult {
  return {
    source,
    status: 'failed',
    productsProcessed: 0,
    productsCreated: 0,
    productsUpdated: 0,
    offersProcessed: 0,
    errorsCount: 1,
    errorMessage: message,
    durationMs: Date.now() - startedAt,
    sampleProductIds: [],
  }
}
