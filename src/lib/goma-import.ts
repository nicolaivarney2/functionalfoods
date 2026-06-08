import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { assertGomaImportEnabled } from '@/lib/goma-sunset'

// Deterministic hash function as fallback if crypto fails
// Uses a combination of character codes to create a 32-char hex string
function simpleHash(str: string): string {
  let hash1 = 0
  let hash2 = 0
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash1 = ((hash1 << 5) - hash1) + char
    hash1 = hash1 & hash1 // Convert to 32bit integer
    
    hash2 = ((hash2 << 7) - hash2) + char + i
    hash2 = hash2 & hash2
  }
  
  // Combine both hashes and convert to hex
  const combined = Math.abs(hash1).toString(16).padStart(8, '0') + 
                   Math.abs(hash2).toString(16).padStart(8, '0')
  
  // Pad or truncate to exactly 32 chars
  return (combined + combined + combined + combined).substring(0, 32)
}

type GomaProduct = {
  unit: string | null
  brand: string | null
  amount: number | null
  category: string | null
  store_id: string
  image_url: string | null
  is_on_sale: boolean
  product_id: string
  s_category: string | null
  store_logo: string | null
  store_name: string
  description: string | null
  product_url: string | null
  is_available: boolean
  normal_price: number
  product_name: string
  current_price: number
  sale_valid_to: string | null
  price_per_unit: number | null
  base_product_id: string | null
  department_name: string | null
  sale_valid_from: string | null
  price_per_kilogram: number | null
  discount_percentage: number | null
}

type GomaSearchResponse = {
  products: GomaProduct[]
  total_count: number
  total_on_sale_count: number
}

type PostgrestError = { code?: string; message?: string }

function isDeadlockError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false
  return error.code === '40P01' || (error.message?.toLowerCase().includes('deadlock') ?? false)
}

async function withDeadlockRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const code = (err as { code?: string })?.code
      const isDeadlock = code === '40P01' || message.toLowerCase().includes('deadlock')
      if (!isDeadlock || attempt === maxAttempts) throw err
      const delayMs = 150 * attempt + Math.floor(Math.random() * 100)
      console.warn(`⚠️ Deadlock during ${label}, retry ${attempt}/${maxAttempts - 1} in ${delayMs}ms`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw new Error(`Unreachable: ${label}`)
}

function throwOnSupabaseError(error: PostgrestError | null, context: string): void {
  if (!error) return
  if (isDeadlockError(error)) {
    const err = new Error(error.message || 'deadlock detected')
    ;(err as Error & { code?: string }).code = error.code
    throw err
  }
  console.error(`❌ ${context}:`, error)
  throw error
}

/** Deterministic product ID from brand + name + amount + unit (see import header comment). */
function generateProductId(p: GomaProduct): string {
  const brand = (p.brand || '').trim().toLowerCase()
  const name = (p.product_name || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const amount = p.amount != null ? String(p.amount) : ''
  const unit = (p.unit || '').trim().toLowerCase()
  const key = `${brand}|${name}|${amount}|${unit}`

  try {
    const hash = createHash('sha256').update(key).digest('hex').substring(0, 32)
    const isValidHash =
      hash && hash.length === 32 && !hash.includes('-') && /^[a-f0-9]{32}$/.test(hash)
    if (isValidHash) return hash

    console.warn(`⚠️ Invalid crypto hash, using fallback for: ${p.product_name}`)
    return simpleHash(key)
  } catch (error) {
    console.warn(`⚠️ Crypto hash failed, using fallback for: ${p.product_name}`, error)
    return simpleHash(key)
  }
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  return createClient(url, serviceKey)
}

function getGomaApiKey() {
  const key = process.env.GOMA_API_KEY
  if (!key) {
    throw new Error('GOMA_API_KEY is not set in environment variables')
  }
  return key
}

function normalizeForQueueFilter(v: string | null | undefined): string {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Keep ingredient-match queue focused on edible products.
 * We still import ALL products to product feed, but non-food should not pollute the queue.
 */
function isFoodRelevantForIngredientQueue(p: GomaProduct): boolean {
  const department = normalizeForQueueFilter(p.department_name)
  const category = normalizeForQueueFilter(p.category)
  const subcategory = normalizeForQueueFilter(p.s_category)

  // 1) Fast path: deterministic whitelist by top-level department from Goma
  // (cheaper and less fragile than wide text-marker scanning).
  const allowedDepartments = new Set([
    'frugt og gront',
    'kod og fisk',
    'mejeri og kol',
    'kolonial',
    'frost',
    'brod og kager',
    'drikkevarer',
    'slik og snacks',
    'nemt og hurtigt',
    'kiosk',
  ])
  const blockedDepartments = new Set([
    'husholdning',
    'personlig pleje',
    'baby og familie',
    'non-food',
    'non food',
  ])

  if (department) {
    if (blockedDepartments.has(department)) return false
    if (allowedDepartments.has(department)) return true
  }

  // 2) Fallback when department is missing/inconsistent.
  // We only inspect category fields (not full product title) to stay deterministic.
  const text = `${category} | ${subcategory}`
  if (!text.trim()) return true

  const blockedCategoryMarkers = [
    'kattemad',
    'hund',
    'pet',
    'husholdning',
    'personlig pleje',
    'tekstil',
    'stearin',
    'duftlys',
    'fyrfadslys',
    'kronelys',
    'bloklys',
    'rengoring',
    'opvask',
    'toiletpapir',
    'kokkenrulle',
    'serviet',
  ]
  if (blockedCategoryMarkers.some((marker) => text.includes(marker))) return false

  const foodCategoryMarkers = [
    'frugt',
    'gront',
    'kod',
    'fisk',
    'mejeri',
    'brod',
    'kager',
    'frost',
    'drikke',
    'vin',
    'ol',
    'sodavand',
    'vand',
    'kolonial',
    'konserves',
    'is',
    'slik',
    'snack',
    'pasta',
    'ost',
    'saucer',
    'dressing',
    'paalaeg',
  ]
  return foodCategoryMarkers.some((marker) => text.includes(marker))
}

/**
 * Nye produkter (første gang de ses i DB) lander i kø til manuel ingrediens-match.
 * Sæt PRODUCT_MATCH_QUEUE_ENABLED=false for at slå fra. Kræver tabellen product_ingredient_match_queue.
 */
async function enqueueNewProductsForIngredientMatching(
  supabase: SupabaseClient,
  storeId: string,
  newProductIds: string[],
  productMap: Map<string, { productId: string; product: GomaProduct }>,
) {
  if (process.env.PRODUCT_MATCH_QUEUE_ENABLED === 'false') return
  if (newProductIds.length === 0) return

  try {
    const queueRows: Array<{
      product_id: string
      store_product_id: string
      store_id: string
      product_name_snapshot: string | null
      status: string
    }> = []

    let skippedNonFood = 0
    for (const pid of newProductIds) {
      const entry = productMap.get(pid)
      if (!entry) continue
      const p = entry.product
      if (!isFoodRelevantForIngredientQueue(p)) {
        skippedNonFood++
        continue
      }
      queueRows.push({
        product_id: pid,
        store_product_id: p.product_id,
        store_id: storeId,
        product_name_snapshot: p.product_name,
        status: 'pending',
      })
    }

    if (skippedNonFood > 0) {
      console.log(`🧹 Sprang ${skippedNonFood} non-food produkter over (ikke sat i ingrediens-kø)`)
    }

    if (queueRows.length === 0) return

    const extIds = [...new Set(queueRows.map((r) => r.store_product_id))]
    const matchedExt = new Set<string>()
    for (let i = 0; i < extIds.length; i += 150) {
      const chunk = extIds.slice(i, i + 150)
      const { data: rows } = await supabase
        .from('product_ingredient_matches')
        .select('product_external_id')
        .in('product_external_id', chunk)
      rows?.forEach((r: { product_external_id: string }) =>
        matchedExt.add(r.product_external_id),
      )
    }

    const filtered = queueRows.filter((r) => !matchedExt.has(r.store_product_id))
    if (filtered.length === 0) return

    const pids = [...new Set(filtered.map((r) => r.product_id))]
    const pendingProducts = new Set<string>()
    for (let i = 0; i < pids.length; i += 150) {
      const chunk = pids.slice(i, i + 150)
      const { data: rows } = await supabase
        .from('product_ingredient_match_queue')
        .select('product_id')
        .eq('status', 'pending')
        .in('product_id', chunk)
      rows?.forEach((r: { product_id: string }) => pendingProducts.add(r.product_id))
    }

    const toInsert = filtered.filter((r) => !pendingProducts.has(r.product_id))
    if (toInsert.length === 0) return

    const { error } = await supabase.from('product_ingredient_match_queue').insert(toInsert)
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn(
          '⚠️ product_ingredient_match_queue mangler — kør migration supabase/migrations/20260417120000_product_ingredient_match_queue.sql',
        )
        return
      }
      console.error('⚠️ Error enqueueing product match queue:', error)
    } else {
      console.log(`📋 Sat ${toInsert.length} nye produkt(er) i ingrediens-match-kø`)
    }
  } catch (e) {
    console.error('⚠️ enqueueNewProductsForIngredientMatching:', e)
  }
}

export type ImportOptions = {
  stores: string[]
  limit?: number
  pages?: number
  onProgress?: (info: { store: string; page: number; imported: number; total: number }) => void
}

function resolveStoreSlug(storeName: string): string {
  const key = String(storeName || '').trim().toLowerCase()
  const explicit: Record<string, string> = {
    'føtex': 'fotex',
    'foetex': 'fotex',
    'løvbjerg': 'lovbjerg',
    'lovbjerg': 'lovbjerg',
    '365discount': '365discount',
    'abc lavpris': 'abc-lavpris',
    'superbrugsen': 'superbrugsen',
    'rema 1000': 'rema-1000',
  }
  return explicit[key] || key.replace(/\s+/g, '-')
}

/**
 * ⚠️ IMPORTANT: Product ID Generation Strategy
 * 
 * We generate unique product IDs based on: brand + normalized name + amount + unit
 * This prevents different products (different brands/sizes) from being incorrectly grouped together.
 * 
 * Previously, we used Goma's `base_product_id` directly, which was too broad and grouped
 * products that should be separate (e.g., Libresse 58 stk vs. generic 8 stk, or 600g vs. 500g).
 * 
 * ⚠️ BREAKING CHANGE: This means existing products in the database will have old IDs.
 * To fix this, you need to:
 * 1. Clear all data from `products` and `product_offers` tables
 * 2. Re-import all products using this new logic
 * 
 * The old `base_product_id` is still stored in `metadata.goma_base_product_id` for reference.
 */

export async function importGomaProducts(options: ImportOptions) {
  assertGomaImportEnabled()

  const supabase = getSupabaseAdminClient()
  const apiKey = getGomaApiKey()
  const importStartedAtIso = new Date().toISOString()

  const limit = options.limit ?? 100
  const pages = options.pages ?? 1

  // How many Goma pages to fetch in parallel per store. Goma calls dominate
  // runtime (~1-2s each). DB writes run sequentially after each batch to avoid
  // Postgres deadlocks from concurrent upserts to products/product_offers.
  const PAGE_CONCURRENCY = 6

  let totalImported = 0

  for (const storeName of options.stores) {
    const storeId = resolveStoreSlug(storeName)
    let fullyScannedStore = false

    // Upsert store row
    await supabase
      .from('stores')
      .upsert(
        {
          id: storeId,
          name: storeName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )

    type FetchedPage = {
      page: number
      products: GomaProduct[]
      totalCount: number
      isLastPage: boolean
    }

    const fetchGomaPage = async (page: number): Promise<FetchedPage> => {
      const offset = page * limit
      const body = {
        p_search_term: '',
        p_on_sale_only: false,
        p_category_filter: null,
        p_department_filter: null,
        p_store_filter: [storeName],
        p_food_departments: null,
        p_is_available_only: true,
        p_my_products_only: false,
        p_previously_bought_only: false,
        p_labels_filter: null,
        p_order_by_clause: 'is_on_sale DESC, discount_percentage DESC NULLS LAST, similarity DESC',
        p_limit_val: limit,
        p_offset_val: offset,
        p_session_id: 'functionalfoods-internal-import',
        p_log_search: false,
        p_source: null,
      }

      const res = await fetch('https://api.goma.gg/rest/v1/rpc/search_products_public_v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Goma API error (${res.status}): ${text}`)
      }

      const data = (await res.json()) as GomaSearchResponse
      const products = data.products || []

      console.log(`📦 Fetched ${products.length} products from Goma for ${storeName} page ${page}`)

      if (products.length === 0) {
        console.log(`⚠️ No products returned for ${storeName} page ${page}, stopping`)
        return { page, products: [], totalCount: data.total_count, isLastPage: true }
      }

      return {
        page,
        products,
        totalCount: data.total_count,
        isLastPage: products.length < limit,
      }
    }

    const persistGomaPage = async (
      fetched: FetchedPage,
    ): Promise<{ page: number; imported: number; isLastPage: boolean }> => {
      const { page, products, totalCount, isLastPage } = fetched

      return withDeadlockRetry(`Goma persist ${storeName} page ${page}`, async () => {
        const productMap = new Map<string, { productId: string; product: GomaProduct }>()
        let hashErrors = 0
        for (const p of products) {
          try {
            const productId = generateProductId(p)
            if (!productId || productId.length === 0) {
              console.error(`❌ Generated empty productId for: ${p.product_name}`)
              hashErrors++
              continue
            }
            if (!productMap.has(productId)) {
              productMap.set(productId, { productId, product: p })
            } else {
              const existing = productMap.get(productId)!
              if (!existing.product.image_url && p.image_url) {
                productMap.set(productId, { productId, product: p })
              }
            }
          } catch (error) {
            console.error(`❌ Error generating productId for ${p.product_name}:`, error)
            hashErrors++
          }
        }

        if (hashErrors > 0) {
          console.error(`❌ Failed to generate productId for ${hashErrors} products`)
        }

        const nowIso = new Date().toISOString()

        console.log(`🔄 Processing ${productMap.size} unique products for ${storeName} page ${page}`)

        const productRows = Array.from(productMap.values()).map(({ productId, product: p }) => ({
          id: productId,
          name_generic: p.product_name,
          brand: p.brand,
          category: p.category,
          subcategory: p.s_category,
          department: p.department_name,
          unit: p.unit,
          amount: p.amount,
          image_url: p.image_url,
          metadata: {
            goma_base_product_id: p.base_product_id,
            goma_store_product_id: p.product_id,
          } as unknown as Record<string, unknown>,
          updated_at: nowIso,
        }))

        if (productRows.length === 0) {
          console.log(`⚠️ No product rows to insert for ${storeName} page ${page}`)
        } else {
          console.log(`💾 Attempting to upsert ${productRows.length} products for ${storeName} page ${page}`)

          const productIdsForBatch = productRows.map((r) => r.id)
          const existingIdsBefore = new Set<string>()
          for (let i = 0; i < productIdsForBatch.length; i += 150) {
            const chunk = productIdsForBatch.slice(i, i + 150)
            const { data: existingRows } = await supabase.from('products').select('id').in('id', chunk)
            existingRows?.forEach((r: { id: string }) => existingIdsBefore.add(r.id))
          }
          const newProductIdsForQueue = productIdsForBatch.filter((id) => !existingIdsBefore.has(id))

          const { error: productError, data: productData } = await supabase
            .from('products')
            .upsert(productRows, { onConflict: 'id' })
            .select('id')

          throwOnSupabaseError(
            productError,
            `Error upserting products for ${storeName} page ${page}`,
          )

          console.log(`✅ Upserted ${productRows.length} products for ${storeName} page ${page}`)
          if (productData) {
            console.log(`✅ Upsert returned ${productData.length} products`)
          }

          await enqueueNewProductsForIngredientMatching(
            supabase,
            storeId,
            newProductIdsForQueue,
            productMap,
          )
        }

        const offerMap = new Map<string, { productId: string; product: GomaProduct }>()
        for (const p of products) {
          const productId = generateProductId(p)
          const key = `${storeId}:${p.product_id}`
          if (!offerMap.has(key)) {
            offerMap.set(key, { productId, product: p })
          }
        }

        const offerRows = Array.from(offerMap.values()).map(({ productId, product: p }) => {
          let isOnSale = p.is_on_sale

          if (p.normal_price && p.current_price && p.normal_price > p.current_price) {
            isOnSale = true
          } else if (p.normal_price && p.current_price && p.normal_price <= p.current_price) {
            isOnSale = false
          }

          if (isOnSale && p.sale_valid_to) {
            const saleEndDate = new Date(p.sale_valid_to)
            if (saleEndDate < new Date()) {
              isOnSale = false
            }
          }

          const nowDate = new Date()
          const isOfferDateValid = !p.sale_valid_to || new Date(p.sale_valid_to) >= nowDate
          const isOfferActive = isOnSale && isOfferDateValid

          let discountPercentage = null
          if (isOnSale && p.normal_price && p.current_price && p.normal_price > p.current_price) {
            discountPercentage = Math.round(
              ((p.normal_price - p.current_price) / p.normal_price) * 100,
            )
          }

          return {
            product_id: productId,
            store_id: storeId,
            store_product_id: p.product_id,
            name_store: p.product_name,
            product_url: p.product_url,
            current_price: p.current_price,
            normal_price: p.normal_price,
            is_on_sale: isOnSale,
            is_offer_active: isOfferActive,
            discount_percentage: discountPercentage || (isOnSale ? p.discount_percentage : null),
            price_per_unit: p.price_per_unit,
            price_per_kilogram: p.price_per_kilogram,
            amount: p.amount,
            unit: p.unit,
            is_available: p.is_available,
            sale_valid_from: p.sale_valid_from,
            sale_valid_to: p.sale_valid_to,
            source: 'goma',
            last_seen_at: nowIso,
            updated_at: nowIso,
          }
        })

        console.log(`🔄 Processing ${offerRows.length} offers for ${storeName} page ${page}`)

        const { error: offerError } = await supabase.from('product_offers').upsert(offerRows, {
          onConflict: 'store_id,store_product_id',
        })

        throwOnSupabaseError(offerError, `Error upserting offers for ${storeName} page ${page}`)

        console.log(`✅ Upserted ${offerRows.length} offers for ${storeName} page ${page}`)

        if (options.onProgress) {
          options.onProgress({
            store: storeName,
            page,
            imported: products.length,
            total: totalCount,
          })
        }

        return { page, imported: products.length, isLastPage }
      })
    }

    // Fetch pages in parallel batches; persist sequentially to avoid deadlocks.
    let stopAfterCurrentBatch = false
    for (
      let batchStart = 0;
      batchStart < pages && !stopAfterCurrentBatch;
      batchStart += PAGE_CONCURRENCY
    ) {
      const batchSize = Math.min(PAGE_CONCURRENCY, pages - batchStart)
      const batchPages = Array.from({ length: batchSize }, (_, i) => batchStart + i)

      const fetchedPages = await Promise.all(batchPages.map((p) => fetchGomaPage(p)))

      for (const fetched of fetchedPages.sort((a, b) => a.page - b.page)) {
        if (fetched.products.length === 0) {
          fullyScannedStore = true
          stopAfterCurrentBatch = true
          continue
        }

        const result = await persistGomaPage(fetched)
        totalImported += result.imported
        if (result.isLastPage) {
          fullyScannedStore = true
          stopAfterCurrentBatch = true
        }
      }
    }

    // Step 2: Authoritative offer verification.
    //
    // Problem: Goma sorterer produkter med "is_on_sale DESC". Når et tilbud slutter,
    // synker produktet ned i resultatlisten og falder typisk uden for vores 6000-produkts
    // vindue. Resultatet er, at vores DB beholder gamle on-sale-data selvom REMA og Goma
    // er enige om at tilbuddet er forbi.
    //
    // Løsning: Lav en separat letvægts-forespørgsel mod Goma med p_on_sale_only=true.
    // Den returnerer kun aktuelle tilbud (typisk <500 produkter pr. butik). Alt vi har
    // i DB med is_offer_active=true men IKKE i Gomas tilbudsliste => tilbuddet er slut.
    let verificationSuccessful = false
    const currentOfferStoreProductIds = new Set<string>()
    try {
      const offerVerifyLimit = 200
      const offerVerifyMaxPages = 10 // 10 * 200 = 2000 tilbud pr. butik – rigeligt
      let offersFetched = 0

      for (let page = 0; page < offerVerifyMaxPages; page++) {
        const offset = page * offerVerifyLimit
        const verifyBody = {
          p_search_term: '',
          p_on_sale_only: true,
          p_category_filter: null,
          p_department_filter: null,
          p_store_filter: [storeName],
          p_food_departments: null,
          p_is_available_only: true,
          p_my_products_only: false,
          p_previously_bought_only: false,
          p_labels_filter: null,
          p_order_by_clause: 'is_on_sale DESC, discount_percentage DESC NULLS LAST, similarity DESC',
          p_limit_val: offerVerifyLimit,
          p_offset_val: offset,
          p_session_id: 'functionalfoods-internal-verify',
          p_log_search: false,
          p_source: null,
        }

        const verifyRes = await fetch(
          'https://api.goma.gg/rest/v1/rpc/search_products_public_v1',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(verifyBody),
          },
        )

        if (!verifyRes.ok) {
          console.warn(
            `⚠️ Offer verification API non-OK for ${storeName} page ${page}: ${verifyRes.status}`,
          )
          break // hold verificationSuccessful=false så vi IKKE wiper offers
        }
        verificationSuccessful = true

        const verifyJson = (await verifyRes.json()) as GomaSearchResponse
        const products = verifyJson.products || []
        for (const p of products) {
          if (p.product_id) currentOfferStoreProductIds.add(p.product_id)
        }
        offersFetched += products.length
        if (products.length < offerVerifyLimit) break
      }

      console.log(
        `📋 Offer verification: ${storeName} har ${currentOfferStoreProductIds.size} aktive tilbud iflg. Goma (success=${verificationSuccessful})`,
      )
    } catch (verifyErr) {
      console.warn(
        `⚠️ Offer verification fejlede for ${storeName}, springer auto-deaktivering over:`,
        verifyErr,
      )
    }

    if (verificationSuccessful) {
      try {
        // Hent alle DB-tilbud for butikken markeret aktive
        const { data: dbActive, error: dbActiveError } = await supabase
          .from('product_offers')
          .select('id, store_product_id, normal_price')
          .eq('store_id', storeId)
          .eq('source', 'goma')
          .eq('is_offer_active', true)

        if (dbActiveError) {
          console.error(
            `⚠️ Kunne ikke hente DB offers for verification cleanup for ${storeId}:`,
            dbActiveError.message,
          )
        } else {
          const ended = (dbActive || []).filter(
            (row: { store_product_id: string | null }) =>
              row.store_product_id && !currentOfferStoreProductIds.has(row.store_product_id),
          )

          if (ended.length === 0) {
            console.log(`✅ ${storeName}: Ingen tilbud at deaktivere efter verification`)
          } else {
            console.log(
              `🛑 ${storeName}: Deaktiverer ${ended.length} tilbud som Goma ikke længere rapporterer som aktive`,
            )

            const BATCH = 500
            for (let i = 0; i < ended.length; i += BATCH) {
              const batch = ended.slice(i, i + BATCH)
              const ids = batch.map((r: { id: string }) => r.id)
              const { error: deactivateError } = await supabase
                .from('product_offers')
                .update({
                  is_on_sale: false,
                  is_offer_active: false,
                  discount_percentage: null,
                  // Marker som lige udløbet, så frontendens
                  // isOfferDateValid-check ('sale_valid_to >= now()') sætter offer = false
                  // selv hvis current_price < normal_price stadig findes i DB.
                  sale_valid_to: importStartedAtIso,
                })
                .in('id', ids)

              if (deactivateError) {
                console.error(
                  `⚠️ Fejl ved deaktivering af endte tilbud for ${storeId}:`,
                  deactivateError.message,
                )
              }
            }
          }
        }
      } catch (cleanupErr) {
        console.error(
          `⚠️ Uventet fejl i offer-verification cleanup for ${storeId}:`,
          cleanupErr,
        )
      }
    }

    // Step 3: Backup last_seen_at-baseret stale cleanup
    //
    // Verification ovenfor er primær. Denne fungerer som safety net for tilfælde
    // hvor verification fejler, eller hvor der er produkter med last_seen_at fra
    // en tid hvor de ikke længere bør være aktive.
    try {
      const staleThreshold = fullyScannedStore
        ? importStartedAtIso
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24h, ned fra 2 dage

      console.log(
        `🧹 Stale-cleanup (last_seen_at) for ${storeId} før ${staleThreshold} (fullScan=${fullyScannedStore})`,
      )

      const { error: cleanupError } = await supabase
        .from('product_offers')
        .update({
          is_on_sale: false,
          is_offer_active: false,
          discount_percentage: null,
          sale_valid_to: importStartedAtIso,
        })
        .eq('store_id', storeId)
        .eq('source', 'goma')
        .eq('is_offer_active', true)
        .lt('last_seen_at', staleThreshold)

      if (cleanupError) {
        console.error(
          `⚠️ Error cleaning up stale Goma offers for ${storeId}:`,
          cleanupError,
        )
      } else {
        console.log(`✅ Stale cleanup completed for ${storeId}`)
      }
    } catch (error) {
      console.error(
        `⚠️ Unexpected error during stale offer cleanup for store ${storeId}:`,
        error,
      )
    }
  }

  return { totalImported }
}

