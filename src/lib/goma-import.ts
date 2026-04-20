import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

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
  base_product_id: string
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

    for (const pid of newProductIds) {
      const entry = productMap.get(pid)
      if (!entry) continue
      const p = entry.product
      queueRows.push({
        product_id: pid,
        store_product_id: p.product_id,
        store_id: storeId,
        product_name_snapshot: p.product_name,
        status: 'pending',
      })
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
  const supabase = getSupabaseAdminClient()
  const apiKey = getGomaApiKey()

  const limit = options.limit ?? 100
  const pages = options.pages ?? 1

  let totalImported = 0

  for (const storeName of options.stores) {
    const storeId = storeName.toLowerCase().replace(/\s+/g, '-')

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

    for (let page = 0; page < pages; page++) {
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

      const res = await fetch('https://api.goma.gg/rest/v1/rpc/search_products_advanced_v2', {
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
        break
      }

      // Generate unique product IDs based on brand + normalized name + amount + unit
      // This prevents different products (different brands/sizes) from being grouped together
      const generateProductId = (p: GomaProduct): string => {
        // Normalize brand (handle null/empty)
        const brand = (p.brand || '').trim().toLowerCase()
        
        // Normalize product name (remove extra whitespace, lowercase)
        const name = (p.product_name || '').trim().toLowerCase().replace(/\s+/g, ' ')
        
        // Get amount and unit (handle null)
        const amount = p.amount != null ? String(p.amount) : ''
        const unit = (p.unit || '').trim().toLowerCase()
        
        // Create a unique key: brand + name + amount + unit
        // This ensures Libresse 58 stk ≠ generic 8 stk, and 600g ≠ 500g
        const key = `${brand}|${name}|${amount}|${unit}`
        
        // Use SHA-256 hash to create a deterministic, fixed-length ID
        // Take first 32 characters for a reasonable length
        try {
          // Try Node.js crypto module first (should work in Next.js API routes)
          const hash = createHash('sha256').update(key).digest('hex').substring(0, 32)
          
          // Validate hash format (should be 32 hex characters, no dashes, lowercase)
          const isValidHash = hash && 
            hash.length === 32 && 
            !hash.includes('-') && 
            /^[a-f0-9]{32}$/.test(hash)
          
          if (isValidHash) {
            return hash
          }
          
          // If hash is invalid, try fallback
          console.warn(`⚠️ Invalid crypto hash, using fallback for: ${p.product_name}`)
          const fallbackHash = simpleHash(key)
          console.log(`✅ Fallback hash generated: ${fallbackHash.substring(0, 8)}... for ${p.product_name}`)
          return fallbackHash
        } catch (error) {
          // If crypto fails completely, use fallback hash
          console.warn(`⚠️ Crypto hash failed, using fallback for: ${p.product_name}`, error)
          const fallbackHash = simpleHash(key)
          console.log(`✅ Fallback hash generated: ${fallbackHash.substring(0, 8)}... for ${p.product_name}`)
          return fallbackHash
        }
      }

      // Upsert global products (dedupe by our generated product ID)
      const productMap = new Map<string, { productId: string; product: GomaProduct }>()
      let skippedNoBaseId = 0
      let hashErrors = 0
      for (const p of products) {
        if (!p.base_product_id) {
          skippedNoBaseId++
          continue // Skip products without base_product_id
        }
        
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
            // If we already have this product, prefer the one with an image if current doesn't have one
            const existing = productMap.get(productId)!
            if (!existing.product.image_url && p.image_url) {
              productMap.set(productId, { productId, product: p })
            }
          }
        } catch (error) {
          console.error(`❌ Error generating productId for ${p.product_name}:`, error)
          hashErrors++
          // Continue with next product instead of failing entire import
        }
      }
      
      if (hashErrors > 0) {
        console.error(`❌ Failed to generate productId for ${hashErrors} products`)
      }

      if (skippedNoBaseId > 0) {
        console.log(`⚠️ Skipped ${skippedNoBaseId} products without base_product_id for ${storeName} page ${page}`)
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
          goma_base_product_id: p.base_product_id, // Store original for reference
          goma_store_product_id: p.product_id,
        } as unknown as Record<string, unknown>,
        updated_at: nowIso,
      }))

      if (productRows.length === 0) {
        console.log(`⚠️ No product rows to insert for ${storeName} page ${page}`)
      } else {
        console.log(`💾 Attempting to upsert ${productRows.length} products for ${storeName} page ${page}`)
        console.log(`💾 Sample product ID: ${productRows[0].id} (length: ${productRows[0].id.length}, is UUID: ${productRows[0].id.includes('-')})`)

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
          .upsert(productRows, {
            onConflict: 'id',
          })
          .select('id')

        if (productError) {
          console.error(`❌ Error upserting products for ${storeName} page ${page}:`, productError)
          console.error(`❌ Product error details:`, JSON.stringify(productError, null, 2))
          console.error(`❌ Sample product row:`, JSON.stringify(productRows[0], null, 2))
          throw productError
        }

        console.log(`✅ Upserted ${productRows.length} products for ${storeName} page ${page}`)
        if (productData) {
          console.log(`✅ Upsert returned ${productData.length} products`)
        }
        
        // Verify products were actually inserted
        if (productRows.length > 0) {
          const sampleIds = productRows.slice(0, 5).map(r => r.id)
          const { data: verifyData, error: verifyError, count: verifyCount } = await supabase
            .from('products')
            .select('id', { count: 'exact' })
            .in('id', sampleIds)
          
          if (verifyError) {
            console.error(`⚠️ Error verifying products:`, verifyError)
          } else {
            console.log(`✅ Verified: ${verifyData?.length || 0}/${sampleIds.length} sample products exist in database (count: ${verifyCount})`)
          }
        }

        await enqueueNewProductsForIngredientMatching(
          supabase,
          storeId,
          newProductIdsForQueue,
          productMap,
        )
      }

      // Upsert offers (dedupe by store_id + store_product_id within this batch)
      const offerMap = new Map<string, { productId: string; product: GomaProduct }>()
      for (const p of products) {
        // Skip products without a global/base id – we can't link them korrekt til products-tabellen
        if (!p.base_product_id) continue
        
        const productId = generateProductId(p)
        const key = `${storeId}:${p.product_id}`
        if (!offerMap.has(key)) {
          offerMap.set(key, { productId, product: p })
        }
      }

      const offerRows = Array.from(offerMap.values()).map(({ productId, product: p }) => {
        // Log if we're using fallback (UUID format indicates old base_product_id)
        if (productId.length === 36 && productId.includes('-')) {
          console.warn(`⚠️ Using fallback base_product_id for offer: ${p.product_name} (productId: ${productId})`)
        }
        
        // Check if offer has expired - if sale_valid_to is in the past, mark as not on sale
        let isOnSale = p.is_on_sale
        
        // IMPORTANT: Also check if current_price < normal_price to determine if on sale
        // Goma's is_on_sale flag might not always be accurate
        if (p.normal_price && p.current_price && p.normal_price > p.current_price) {
          // Price difference indicates it's on sale
          isOnSale = true
        } else if (p.normal_price && p.current_price && p.normal_price <= p.current_price) {
          // No price difference - not on sale
          isOnSale = false
        }
        
        // Check if sale has expired
        if (isOnSale && p.sale_valid_to) {
          const saleEndDate = new Date(p.sale_valid_to)
          const now = new Date()
          if (saleEndDate < now) {
            // Offer has expired - mark as not on sale
            isOnSale = false
            console.log(`⏰ Offer expired for ${p.product_name}: sale_valid_to was ${p.sale_valid_to}`)
          }
        }

        const nowDate = new Date()
        const isOfferDateValid = !p.sale_valid_to || new Date(p.sale_valid_to) >= nowDate
        const isOfferActive = isOnSale && isOfferDateValid
        
        // Calculate discount percentage if on sale
        let discountPercentage = null
        if (isOnSale && p.normal_price && p.current_price && p.normal_price > p.current_price) {
          discountPercentage = Math.round(((p.normal_price - p.current_price) / p.normal_price) * 100)
        }
        
        return {
          product_id: productId, // Use our generated product ID, not base_product_id
          store_id: storeId,
          store_product_id: p.product_id,
          name_store: p.product_name,
          product_url: p.product_url,
          current_price: p.current_price,
          normal_price: p.normal_price,
          is_on_sale: isOnSale, // Use calculated value based on price difference
          is_offer_active: isOfferActive, // Active offer flag for fast filtering
          discount_percentage: discountPercentage || (isOnSale ? p.discount_percentage : null), // Use calculated or Goma's value
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

      if (offerError) {
        console.error(`❌ Error upserting offers for ${storeName} page ${page}:`, offerError)
        console.error(`❌ Offer error details:`, JSON.stringify(offerError, null, 2))
        throw offerError
      }

      console.log(`✅ Upserted ${offerRows.length} offers for ${storeName} page ${page}`)
      
      // Verify that products were actually inserted
      if (productRows.length > 0) {
        const { count: productCount, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .in('id', productRows.map(r => r.id))
        
        if (countError) {
          console.error(`⚠️ Error counting products:`, countError)
        } else {
          console.log(`✅ Verified: ${productCount} products exist in database (expected ${productRows.length})`)
        }
      }

      totalImported += products.length

      if (options.onProgress) {
        options.onProgress({
          store: storeName,
          page,
          imported: products.length,
          total: data.total_count,
        })
      }

      if (products.length < limit) {
        break
      }
    }

    // Cleanup stale Goma offers for this store
    try {
      const days = 10
      const staleThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      console.log(
        `🧹 Cleaning up stale Goma offers for ${storeId} last seen before ${staleThreshold}`,
      )

      const { error: cleanupError } = await supabase
        .from('product_offers')
        .update({
          is_on_sale: false,
          is_offer_active: false,
          discount_percentage: null,
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
        console.log(`✅ Cleanup of stale Goma offers completed for ${storeId}`)
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

