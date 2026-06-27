/**
 * Goma → fooddata sync for offers-only chains.
 *
 * Writes to grocery Supabase (fooddata). FF main DB + Planomo consume via
 * fooddata-import (nightly) or direct fooddata reads.
 */

import { getGroceryServiceClient } from '../../db/client'
import type { ProductInsert, ProductOfferInsert, SourceChain } from '../../types'
import {
  filterGomaStoresForImport,
  gomaStoreNameToChain,
} from '@/lib/goma-import-stores'
import {
  fetchGomaActiveOfferProductIds,
  fetchGomaOffersPage,
  GOMA_OFFERS_MAX_PAGES,
  GOMA_OFFERS_PAGE_SIZE,
} from './client'
import { mapGomaToOffer, mapGomaToProduct } from './mapper'
import type { GomaProduct } from './types'

const PRODUCT_BATCH_SIZE = 200
const OFFER_BATCH_SIZE = 200
const PAGE_CONCURRENCY = 4

/** Standard cron/manual sync — kun tilbud, ikke fuldt katalog. */
export const GOMA_SYNC_DEFAULTS = {
  limit: GOMA_OFFERS_PAGE_SIZE,
  pages: GOMA_OFFERS_MAX_PAGES,
} as const

export interface GomaSyncOptions {
  stores: string[]
  limit?: number
  pages?: number
  includeFullCatalog?: boolean
  onProgress?: (info: {
    store: string
    page: number
    imported: number
    total: number
  }) => void
}

export interface GomaSyncResult {
  totalImported: number
  skippedStores: string[]
  storesSynced: string[]
  errors: string[]
}

function dedupeBySourceId(products: GomaProduct[]): GomaProduct[] {
  const byId = new Map<string, GomaProduct>()
  for (const p of products) {
    if (!p.product_id) continue
    const existing = byId.get(p.product_id)
    if (!existing || (!existing.image_url && p.image_url)) {
      byId.set(p.product_id, p)
    }
  }
  return Array.from(byId.values())
}

async function upsertProductsAndOffers(
  chain: SourceChain,
  storeName: string,
  products: GomaProduct[],
  syncedAt: string,
): Promise<number> {
  const supabase = getGroceryServiceClient()
  const unique = dedupeBySourceId(products)
  if (unique.length === 0) return 0

  let processed = 0

  for (let i = 0; i < unique.length; i += PRODUCT_BATCH_SIZE) {
    const slice = unique.slice(i, i + PRODUCT_BATCH_SIZE)
    const productInserts: ProductInsert[] = slice.map((p) =>
      mapGomaToProduct(p, chain, syncedAt),
    )

    const { error: productErr } = await supabase
      .from('products')
      .upsert(productInserts, { onConflict: 'source_chain,source_id', ignoreDuplicates: false })
    if (productErr) {
      throw new Error(`Goma product upsert failed (${storeName}): ${productErr.message}`)
    }

    const sourceIds = slice.map((p) => p.product_id)
    const { data: rows, error: selectErr } = await supabase
      .from('products')
      .select('id, source_id')
      .eq('source_chain', chain)
      .in('source_id', sourceIds)
    if (selectErr) {
      throw new Error(`Goma post-upsert select failed (${storeName}): ${selectErr.message}`)
    }

    const idBySourceId = new Map<string, string>()
    for (const row of rows ?? []) {
      idBySourceId.set(row.source_id as string, row.id as string)
    }

    const offerInserts: ProductOfferInsert[] = []
    for (const p of slice) {
      const productUuid = idBySourceId.get(p.product_id)
      if (!productUuid) continue
      const mapped = mapGomaToOffer(p, productUuid, chain, syncedAt)
      if (mapped) offerInserts.push(mapped)
    }

    for (let j = 0; j < offerInserts.length; j += OFFER_BATCH_SIZE) {
      const offerSlice = offerInserts.slice(j, j + OFFER_BATCH_SIZE)
      const { error: offerErr } = await supabase
        .from('product_offers')
        .upsert(offerSlice, { onConflict: 'product_id,store_id', ignoreDuplicates: false })
      if (offerErr) {
        throw new Error(`Goma offer upsert failed (${storeName}): ${offerErr.message}`)
      }
    }

    processed += slice.length
  }

  return processed
}

async function verifyAndDeactivateStaleOffers(
  chain: SourceChain,
  storeName: string,
  importStartedAtIso: string,
  fullyScannedStore: boolean,
  syncedSourceIds: Set<string>,
): Promise<void> {
  const supabase = getGroceryServiceClient()

  let currentOfferSourceIds = syncedSourceIds
  let verificationSuccessful = fullyScannedStore

  if (verificationSuccessful) {
    console.log(
      `📋 Goma verify ${storeName}: ${currentOfferSourceIds.size} tilbud fra fuld tilbuds-scan (ingen ekstra API-kald)`,
    )
  } else {
    try {
      currentOfferSourceIds = await fetchGomaActiveOfferProductIds(storeName)
      verificationSuccessful = true
      console.log(
        `📋 Goma verify ${storeName}: ${currentOfferSourceIds.size} aktive tilbud iflg. API`,
      )
    } catch (err) {
      console.warn(`⚠️ Goma offer verification fejlede for ${storeName}:`, err)
    }
  }

  if (verificationSuccessful && currentOfferSourceIds.size >= 0) {
    const { data: dbActive, error: dbErr } = await supabase
      .from('product_offers')
      .select('id, product_id')
      .eq('store_id', chain)
      .eq('source', 'goma')
      .eq('is_on_sale', true)

    if (dbErr) {
      console.warn(`⚠️ Kunne ikke hente aktive Goma-tilbud for ${chain}:`, dbErr.message)
    } else if (dbActive?.length) {
      const productIds = [...new Set(dbActive.map((r) => r.product_id as string))]
      const sourceIdByProductId = new Map<string, string>()

      for (let i = 0; i < productIds.length; i += 200) {
        const chunk = productIds.slice(i, i + 200)
        const { data: products, error: prodErr } = await supabase
          .from('products')
          .select('id, source_id')
          .in('id', chunk)
        if (prodErr) {
          console.warn(`⚠️ Goma verify product lookup fejlede for ${chain}:`, prodErr.message)
          break
        }
        for (const row of products ?? []) {
          sourceIdByProductId.set(row.id as string, row.source_id as string)
        }
      }

      const ended = dbActive.filter((row) => {
        const sourceId = sourceIdByProductId.get(row.product_id as string)
        return sourceId && !currentOfferSourceIds.has(sourceId)
      })

      if (ended.length > 0) {
        console.log(`🛑 ${storeName}: deaktiverer ${ended.length} udløbne Goma-tilbud i fooddata`)
        const ids = ended.map((r) => r.id as string)
        for (let i = 0; i < ids.length; i += 500) {
          const batch = ids.slice(i, i + 500)
          const { error } = await supabase
            .from('product_offers')
            .update({
              is_on_sale: false,
              in_stock: false,
              discount_percentage: null,
              offer_until: importStartedAtIso,
            })
            .in('id', batch)
          if (error) {
            console.warn(`⚠️ Goma deactivate batch fejlede for ${chain}:`, error.message)
          }
        }
      }
    }
  }

  const staleThreshold = fullyScannedStore
    ? importStartedAtIso
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { error: staleErr } = await supabase
    .from('product_offers')
    .update({
      is_on_sale: false,
      in_stock: false,
      discount_percentage: null,
      offer_until: importStartedAtIso,
    })
    .eq('store_id', chain)
    .eq('source', 'goma')
    .eq('is_on_sale', true)
    .lt('source_synced_at', staleThreshold)

  if (staleErr) {
    console.warn(`⚠️ Goma stale cleanup fejlede for ${chain}:`, staleErr.message)
  }
}

async function syncGomaStore(
  storeName: string,
  options: Required<Pick<GomaSyncOptions, 'limit' | 'pages'>> &
    Pick<GomaSyncOptions, 'onProgress'>,
): Promise<number> {
  const chain = gomaStoreNameToChain(storeName)
  if (!chain) {
    throw new Error(`Ukendt Goma-butik: ${storeName}`)
  }

  const importStartedAtIso = new Date().toISOString()
  const sessionId = `functionalfoods-goma-${chain}`
  let totalImported = 0
  let fullyScannedStore = false
  const syncedSourceIds = new Set<string>()

  for (
    let batchStart = 0;
    batchStart < options.pages && !fullyScannedStore;
    batchStart += PAGE_CONCURRENCY
  ) {
    const batchSize = Math.min(PAGE_CONCURRENCY, options.pages - batchStart)
    const pages = Array.from({ length: batchSize }, (_, i) => batchStart + i)

    const fetched = await Promise.all(
      pages.map(async (page) => {
        const result = await fetchGomaOffersPage(
          storeName,
          page,
          options.limit,
          sessionId,
        )
        return { page, ...result }
      }),
    )

    for (const batch of fetched.sort((a, b) => a.page - b.page)) {
      if (batch.products.length === 0) {
        fullyScannedStore = true
        break
      }

      for (const p of batch.products) {
        if (p.product_id) syncedSourceIds.add(p.product_id)
      }

      const imported = await upsertProductsAndOffers(
        chain,
        storeName,
        batch.products,
        importStartedAtIso,
      )
      totalImported += imported

      if (options.onProgress) {
        options.onProgress({
          store: storeName,
          page: batch.page,
          imported: batch.products.length,
          total: batch.totalCount,
        })
      }

      if (batch.isLastPage) {
        fullyScannedStore = true
        break
      }
    }
  }

  await verifyAndDeactivateStaleOffers(
    chain,
    storeName,
    importStartedAtIso,
    fullyScannedStore,
    syncedSourceIds,
  )

  return totalImported
}

export async function syncGoma(options: GomaSyncOptions): Promise<GomaSyncResult> {
  const { allowed, skipped } = filterGomaStoresForImport(options.stores, {
    includeFullCatalog: options.includeFullCatalog,
  })

  if (skipped.length > 0) {
    console.log(
      `⏭️ Goma sync springer fuldt-katalog-kæder over (fooddata/Salling/REMA): ${skipped.join(', ')}`,
    )
  }

  if (allowed.length === 0) {
    return { totalImported: 0, skippedStores: skipped, storesSynced: [], errors: [] }
  }

  const limit = options.limit ?? GOMA_SYNC_DEFAULTS.limit
  const pages = options.pages ?? GOMA_SYNC_DEFAULTS.pages
  const errors: string[] = []
  let totalImported = 0
  const storesSynced: string[] = []

  for (const storeName of allowed) {
    try {
      console.log(`🔄 Goma → fooddata sync: ${storeName}`)
      const imported = await syncGomaStore(storeName, { limit, pages, onProgress: options.onProgress })
      totalImported += imported
      storesSynced.push(storeName)
      console.log(`✅ ${storeName}: ${imported} tilbud upsertet i fooddata`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${storeName}: ${msg}`)
      console.error(`❌ Goma sync fejlede for ${storeName}:`, err)
    }
  }

  return { totalImported, skippedStores: skipped, storesSynced, errors }
}
