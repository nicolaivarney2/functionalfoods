import { getGroceryServiceClient } from '../../db/client'
import type { ProductInsert, ProductOfferInsert, SyncLogInsert } from '../../types'
import { iterateAllRemaProducts } from './client'
import { mapRemaOffer, mapRemaProduct } from './mapper'
import type { RemaDepartment, RemaProduct } from './types'

const PRODUCT_BATCH_SIZE = 200
const OFFER_BATCH_SIZE = 200

export interface RemaSyncOptions {
  dryRun?: boolean
  maxProducts?: number
}

export interface RemaSyncResult {
  source: 'rema1000'
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

export async function syncRema1000(
  options: RemaSyncOptions = {},
): Promise<RemaSyncResult> {
  const startedAt = Date.now()
  const supabase = options.dryRun ? null : getGroceryServiceClient()

  let syncLogId: string | undefined
  if (supabase) {
    const initial: SyncLogInsert = {
      source: 'apify-rema', // we reuse the existing enum value; semantically "rema-1000-api"
      status: 'running',
      started_at: new Date(startedAt).toISOString(),
      metadata: { adapter: 'rema-1000-api' },
    }
    const { data, error } = await supabase
      .from('sync_logs')
      .insert(initial)
      .select('id')
      .single()
    if (error) {
      return failureResult(startedAt, `Failed to create sync_log: ${error.message}`)
    }
    syncLogId = data.id
  }

  const productBuffer: ProductInsert[] = []
  const rawBuffer: Array<{ product: RemaProduct; department: RemaDepartment }> = []
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
      rawBuffer.length = 0
      return
    }

    const { error: upsertError } = await supabase
      .from('products')
      .upsert(productBuffer, {
        onConflict: 'source_chain,source_id',
        ignoreDuplicates: false,
      })
    if (upsertError) {
      errorsCount += productBuffer.length
      throw new Error(`REMA product upsert failed: ${upsertError.message}`)
    }

    const sourceIds = productBuffer.map((p) => p.source_id)
    const { data, error: selectError } = await supabase
      .from('products')
      .select('id, source_id, created_at, updated_at')
      .eq('source_chain', 'rema-1000')
      .in('source_id', sourceIds)
    if (selectError) {
      errorsCount += productBuffer.length
      throw new Error(`REMA post-upsert select failed: ${selectError.message}`)
    }

    const idBySourceId = new Map<string, string>()
    for (const row of data ?? []) {
      if (row.created_at === row.updated_at) productsCreated++
      else productsUpdated++
      if (sampleProductIds.length < 5) sampleProductIds.push(row.id as string)
      idBySourceId.set(row.source_id as string, row.id as string)
    }

    const offerBuffer: ProductOfferInsert[] = []
    for (const { product } of rawBuffer) {
      const productId = idBySourceId.get(String(product.id))
      if (!productId) continue
      const offer = mapRemaOffer(product, productId)
      if (offer) offerBuffer.push(offer)
    }

    for (let i = 0; i < offerBuffer.length; i += OFFER_BATCH_SIZE) {
      const slice = offerBuffer.slice(i, i + OFFER_BATCH_SIZE)
      const { error: offerError } = await supabase
        .from('product_offers')
        .upsert(slice, { onConflict: 'product_id,store_id', ignoreDuplicates: false })
      if (offerError) {
        errorsCount += slice.length
        throw new Error(`REMA offer upsert failed: ${offerError.message}`)
      }
      offersProcessed += slice.length
    }

    productBuffer.length = 0
    rawBuffer.length = 0
  }

  try {
    for await (const entry of iterateAllRemaProducts()) {
      if (options.maxProducts && productsProcessed >= options.maxProducts) break
      productBuffer.push(mapRemaProduct(entry.product, entry.department))
      rawBuffer.push(entry)
      productsProcessed++
      if (productBuffer.length >= PRODUCT_BATCH_SIZE) await flushProducts()
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
      source: 'rema1000',
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
    source: 'rema1000',
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

function failureResult(startedAt: number, message: string): RemaSyncResult {
  return {
    source: 'rema1000',
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
