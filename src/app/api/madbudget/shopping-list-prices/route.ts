import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

/**
 * API endpoint to fetch best matching products with prices for shopping list items
 * per selected store.
 * 
 * This endpoint:
 * 1. Takes shopping list items (ingredient names + amounts)
 * 2. Takes selected store IDs
 * 3. Finds best matching products from product_ingredient_matches
 * 4. Filters by store and matches volume (closest >= needed, or largest if insufficient)
 * 5. Returns prices per store
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shoppingListItems, selectedStoreIds } = body

    if (!shoppingListItems || !Array.isArray(shoppingListItems)) {
      return NextResponse.json(
        { success: false, message: 'shoppingListItems array is required' },
        { status: 400 }
      )
    }

    if (!selectedStoreIds || !Array.isArray(selectedStoreIds) || selectedStoreIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'selectedStoreIds array is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseClient()

    // Map store IDs from frontend (1, 2, 8) to database store_id slugs
    // Skal matche `stores.id` / `product_offers.store_id` fra Goma-import (se goma-import.ts: slug = navn lowercase, mellemrum → -).
    const storeIdMap: Record<number, string> = {
      1: 'rema-1000',
      2: 'netto',
      3: 'føtex',
      4: 'bilka',
      5: 'nemlig',
      6: 'meny',
      7: 'spar',
      8: 'løvbjerg'
    }

    const dbStoreIds = selectedStoreIds
      .map((id: number) => storeIdMap[id])
      .filter(Boolean)

    if (dbStoreIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid store IDs found' },
        { status: 400 }
      )
    }

    // Extract ingredient IDs directly from shopping list items
    // If ingredientId is provided, use it directly - no need for name matching!
    const ingredientIdsFromItems = Array.from(
      new Set(
        shoppingListItems
          .map((item: any) => item.ingredientId)
          .filter((id: any): id is string => Boolean(id) && typeof id === 'string')
      )
    )

    console.log(`📦 Processing ${shoppingListItems.length} items (${ingredientIdsFromItems.length} with ingredientId)`)

    // Create map of shopping list item name -> ingredient ID for lookup
    const shoppingListNameToIngredientId = new Map<string, string>()
    for (const item of shoppingListItems) {
      if (item.ingredientId && item.name) {
        shoppingListNameToIngredientId.set(item.name.toLowerCase().trim(), item.ingredientId)
      }
    }
    
    // Normalize ingredient names (used for matching and grams_per_unit fallback)
    const normalizeName = (name: string): string => {
      return name
        .toLowerCase()
        .split(',')[0]
        .replace(/\s+kan\s+undlades/gi, '')
        .replace(/^eks\.\s*/i, '')
        .trim()
    }

    // If no ingredientIds provided, fallback to name matching (for backwards compatibility)
    let ingredientIds = ingredientIdsFromItems
    const ingredientIdSet = new Set(ingredientIds)

    // Load ingredients once for all name-based fallbacks + grams_per_unit mapping
    const { data: allIngredientsMeta } = await supabase
      .from('ingredients')
      .select('id, name, grams_per_unit')
      .limit(5000)

    const gramsPerUnitByNameMap = new Map<string, number>()
    allIngredientsMeta?.forEach((row: { id: string; name: string; grams_per_unit?: number | null }) => {
      if (row.grams_per_unit != null && Number(row.grams_per_unit) > 0) {
        gramsPerUnitByNameMap.set(normalizeName(row.name), Number(row.grams_per_unit))
      }
    })
    
    console.log(`🔍 Step 1: Extracted ${ingredientIds.length} unique ingredientIds from ${shoppingListItems.length} items`)
    
    if (ingredientIds.length === 0) {
      // Fallback: try to match by name
      const ingredientNames = Array.from(
        new Set(shoppingListItems.map((item: any) => item.name?.toLowerCase().trim()).filter(Boolean))
      )
      
      if (ingredientNames.length === 0) {
        return NextResponse.json({
          success: true,
          data: {}
        })
      }

      for (const item of shoppingListItems) {
        const itemName = item.name?.toLowerCase().trim()
        if (!itemName) continue
        
        const normalizedItemName = normalizeName(itemName)
        
        // Try exact match first
        let match = allIngredientsMeta?.find((ing: any) => ing.name.toLowerCase() === itemName)
        
        // Try normalized match
        if (!match) {
          match = allIngredientsMeta?.find((ing: any) => {
            const normalizedIngName = normalizeName(ing.name)
            return normalizedIngName === normalizedItemName || 
                   normalizedItemName.includes(normalizedIngName) ||
                   normalizedIngName.includes(normalizedItemName)
          })
        }
        
          if (match) {
            shoppingListNameToIngredientId.set(itemName, match.id)
            if (!ingredientIdSet.has(match.id)) {
              ingredientIdSet.add(match.id)
              ingredientIds.push(match.id)
            }
          }
      }
      
      // Remove duplicates
      ingredientIds = Array.from(new Set(ingredientIds))
      
      if (ingredientIds.length === 0) {
        console.log('⚠️ No ingredient IDs found after fallback matching')
        return NextResponse.json({
          success: true,
          data: {}
        })
      }
    }

    // Per-item fallback (important): even when SOME items have ingredientId,
    // individual items can still be missing/invalid. Resolve those by name as well.
    const allIngredientsForItemFallback = allIngredientsMeta

    if (allIngredientsForItemFallback?.length) {
      for (const item of shoppingListItems) {
        const itemName = item.name?.toLowerCase().trim()
        if (!itemName) continue

        const normalizedItemName = normalizeName(itemName)
        // Deterministic matching: normalized exact first, then closest partial match.
        let match = allIngredientsForItemFallback.find((ing: any) => normalizeName(ing.name) === normalizedItemName)
        if (!match) {
          const candidates = allIngredientsForItemFallback
            .map((ing: any) => ({ ing, normalized: normalizeName(ing.name) }))
            .filter(({ normalized }) =>
              normalized &&
              (normalizedItemName.includes(normalized) || normalized.includes(normalizedItemName))
            )
            .sort((a, b) => {
              const diffA = Math.abs(a.normalized.length - normalizedItemName.length)
              const diffB = Math.abs(b.normalized.length - normalizedItemName.length)
              return diffA - diffB
            })
          match = candidates[0]?.ing
        }

        if (match) {
          shoppingListNameToIngredientId.set(itemName, match.id)
          if (!ingredientIdSet.has(match.id)) {
            ingredientIdSet.add(match.id)
            ingredientIds.push(match.id)
          }
        }
      }
      ingredientIds = Array.from(new Set(ingredientIds))
    }

    // Load grams_per_unit for stk <-> g conversion (e.g. rødløg 80 g/stk)
    const gramsPerUnitMap = new Map<string, number>()
    if (ingredientIds.length > 0) {
      const chunkSize = 500
      for (let i = 0; i < ingredientIds.length; i += chunkSize) {
        const chunk = ingredientIds.slice(i, i + chunkSize)
        const { data: rows } = await supabase
          .from('ingredients')
          .select('id, grams_per_unit')
          .in('id', chunk)
        rows?.forEach((row: { id: string; grams_per_unit?: number | null }) => {
          if (row.grams_per_unit != null && Number(row.grams_per_unit) > 0) {
            gramsPerUnitMap.set(row.id, Number(row.grams_per_unit))
          }
        })
      }
    }

    // Fetch product matches in batches (Supabase limit: 1000 rows)
    const allMatches: any[] = []
    const batchSize = 500
    let offset = 0

    while (true) {
      const { data: batch, error: matchesError } = await supabase
        .from('product_ingredient_matches')
        .select(`
          ingredient_id,
          product_external_id,
          confidence
        `)
        .in('ingredient_id', ingredientIds)
        .order('ingredient_id', { ascending: true })
        .order('product_external_id', { ascending: true })
        .range(offset, offset + batchSize - 1)

      if (matchesError) {
        console.error('Error fetching product matches:', matchesError)
        break
      }

      if (!batch || batch.length === 0) {
        break
      }

      allMatches.push(...batch)

      if (batch.length < batchSize) {
        break
      }

      offset += batchSize
    }

    console.log(`🔍 Step 2: Found ${allMatches.length} product matches for ${ingredientIds.length} ingredients`)

    // Index matches by ingredient id for fast lookup
    const matchesByIngredient = new Map<string, any[]>()
    for (const match of allMatches) {
      const id = String(match.ingredient_id || '')
      if (!id) continue
      const list = matchesByIngredient.get(id)
      if (list) list.push(match)
      else matchesByIngredient.set(id, [match])
    }
    
    if (allMatches.length === 0) {
      console.log('⚠️ No product matches found in database for these ingredientIds')
      console.log(`📋 Sample ingredientIds that were searched:`, ingredientIds.slice(0, 5))
      return NextResponse.json({
        success: true,
        data: {}, // No product matches found
        debug: {
          ingredientIdsCount: ingredientIds.length,
          sampleIngredientIds: ingredientIds.slice(0, 5),
          message: 'No product_ingredient_matches found for these ingredients'
        }
      })
    }

    // Get unique product external IDs
    const productExternalIds = Array.from(
      new Set(allMatches.map(m => m.product_external_id).filter(Boolean))
    )

    console.log(`🔍 Step 3: Found ${productExternalIds.length} unique products from matches`)
    console.log(`🔍 Step 4: Looking for offers in stores: ${dbStoreIds.join(', ')}`)

    // Fetch product offers for these products, filtered by selected stores
    // Support both old (supermarket_products) and new (products + product_offers) structures
    const productOffersMap = new Map<string, any[]>()
    const chunkSize = 200
    let totalOffersFound = 0

    for (let i = 0; i < productExternalIds.length; i += chunkSize) {
      const chunk = productExternalIds.slice(i, i + chunkSize)

      // Try new structure first: products + product_offers
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, external_id, amount, unit')
        .in('external_id', chunk)

      if (!productsError && products && products.length > 0) {
        // New structure: use products + product_offers
        const productIdToExternalId = new Map<string, string>()
        const productIdToAmount = new Map<string, { amount: string | null, unit: string | null }>()
        products.forEach(p => {
          productIdToExternalId.set(p.id, p.external_id)
          productIdToAmount.set(p.id, { amount: p.amount, unit: p.unit })
        })

        const productIds = Array.from(productIdToExternalId.keys())
        if (productIds.length > 0) {
          const { data: offers, error: offersError } = await supabase
            .from('product_offers')
            .select(`
              id,
              product_id,
              store_id,
              name_store,
              current_price,
              normal_price,
              is_on_sale,
              is_offer_active,
              discount_percentage,
              is_available,
              amount,
              unit
            `)
            .in('product_id', productIds)
            .in('store_id', dbStoreIds)
            .eq('is_available', true)

          if (!offersError && offers) {
            totalOffersFound += offers.length
            offers.forEach(offer => {
              const externalId = productIdToExternalId.get(offer.product_id)
              if (!externalId) return

              if (!productOffersMap.has(externalId)) {
                productOffersMap.set(externalId, [])
              }

              const amountInfo = productIdToAmount.get(offer.product_id)
              productOffersMap.get(externalId)!.push({
                ...offer,
                product_external_id: externalId,
                amount: amountInfo?.amount ?? offer.amount,
                unit: amountInfo?.unit ?? offer.unit
              })
            })
          } else if (offersError) {
            console.error('❌ Error fetching product_offers:', offersError)
          }
        }
      }

      // Also support matches stored as product_offers.store_product_id (new Goma matches)
      const { data: offersByStoreProductId, error: offersByStoreProductIdError } = await supabase
        .from('product_offers')
        .select(`
          id,
          product_id,
          store_id,
          store_product_id,
          name_store,
          current_price,
          normal_price,
          is_on_sale,
          is_offer_active,
          discount_percentage,
          is_available,
          amount,
          unit
        `)
        .in('store_product_id', chunk)
        .in('store_id', dbStoreIds)
        .eq('is_available', true)

      if (!offersByStoreProductIdError && offersByStoreProductId) {
        totalOffersFound += offersByStoreProductId.length
        offersByStoreProductId.forEach(offer => {
          const externalId = offer.store_product_id
          if (!externalId) return

          if (!productOffersMap.has(externalId)) {
            productOffersMap.set(externalId, [])
          }

          productOffersMap.get(externalId)!.push({
            ...offer,
            product_external_id: externalId
          })
        })
      } else if (offersByStoreProductIdError) {
        console.error('❌ Error fetching product_offers by store_product_id:', offersByStoreProductIdError)
      }

      // Also try old structure: supermarket_products (fallback)
      const { data: oldProducts, error: oldProductsError } = await supabase
        .from('supermarket_products')
        .select('external_id, name, category, store, price, original_price, is_on_sale, amount, unit')
        .in('external_id', chunk)

      if (!oldProductsError && oldProducts) {
        oldProducts.forEach(product => {
          // Check if store matches (old structure uses store name, need to map)
          const storeNameMap: Record<string, string[]> = {
            'rema-1000': ['REMA 1000', 'REMA'],
            'netto': ['Netto'],
            'føtex': ['Føtex'],
            'bilka': ['Bilka'],
            'nemlig': ['Nemlig', 'Nemlig.com'],
            'meny': ['MENY'],
            'spar': ['Spar'],
            'løvbjerg': ['Løvbjerg']
          }

          const productStore = product.store || ''
          const matchesStore = dbStoreIds.some(storeId => {
            const storeNames = storeNameMap[storeId] || []
            return storeNames.some(name => productStore.includes(name))
          })

          if (!matchesStore) return

          if (!productOffersMap.has(product.external_id)) {
            productOffersMap.set(product.external_id, [])
          }

          productOffersMap.get(product.external_id)!.push({
            id: product.external_id,
            product_external_id: product.external_id,
            store_id: dbStoreIds.find(sid => {
              const storeNames = storeNameMap[sid] || []
              return storeNames.some(name => productStore.includes(name))
            }) || '',
            name_store: product.name,
            current_price: product.price,
            normal_price: product.original_price,
            is_on_sale: product.is_on_sale || false,
            discount_percentage: product.original_price && product.price
              ? ((product.original_price - product.price) / product.original_price) * 100
              : 0,
            is_available: true,
            amount: product.amount,
            unit: product.unit
          })
        })
      }
    }

    console.log(`🔍 Step 5: Found ${totalOffersFound} total offers from product_offers table`)
    console.log(`🔍 Step 6: Product offers map has ${productOffersMap.size} products with offers`)

    // Index offers by product external id + store id to avoid repeated filtering
    const productOffersByStore = new Map<string, Map<string, any[]>>()
    for (const [externalId, offers] of productOffersMap.entries()) {
      const byStore = new Map<string, any[]>()
      for (const offer of offers) {
        const sid = String(offer.store_id || '')
        if (!sid) continue
        const storeList = byStore.get(sid)
        if (storeList) storeList.push(offer)
        else byStore.set(sid, [offer])
      }
      productOffersByStore.set(externalId, byStore)
    }

    // Now build result: for each shopping list item, find best product per store
    const result: Record<string, Record<string, any>> = {}
    let itemsWithProducts = 0
    let itemsWithoutProducts = 0

    for (const item of shoppingListItems) {
      const shoppingItemName = item.name?.toLowerCase().trim()
      if (!shoppingItemName) continue

      // Use ingredientId directly from shopping list item, or fallback to name lookup
      let ingredientId = item.ingredientId || shoppingListNameToIngredientId.get(shoppingItemName)
      if (!ingredientId) {
        // No ingredientId provided and no match found - skip this item
        continue
      }

      // Find all product matches for this ingredient
      let matchesForIngredient = matchesByIngredient.get(String(ingredientId)) || []
      // If an item has a stale/invalid ID, retry with name-resolved ID
      if (matchesForIngredient.length === 0) {
        const fallbackId = shoppingListNameToIngredientId.get(shoppingItemName)
        if (fallbackId && fallbackId !== ingredientId) {
          ingredientId = fallbackId
          matchesForIngredient = matchesByIngredient.get(String(ingredientId)) || []
        }
      }
      if (matchesForIngredient.length === 0) {
        continue
      }

      // For each store, find best matching product
      for (const storeId of dbStoreIds) {
        const storeKey = storeId // Use DB store ID as key

        if (!result[storeKey]) {
          result[storeKey] = {}
        }

        // Find best product for this ingredient in this store
        // Strategy: Choose product with lowest total price (price * quantity needed)
        let bestProduct: any = null
        let bestTotalPrice = Infinity
        let bestExcess = Infinity // For tie-breaking: prefer less waste
        const neededAmount = Number(String(item.amount ?? '0').replace(',', '.')) || 0
        const neededUnit = item.unit?.toLowerCase() || ''

        for (const match of matchesForIngredient) {
          const storeOffers = productOffersByStore.get(match.product_external_id)?.get(storeId) || []

          for (const offer of storeOffers) {
            // Parse product amount (e.g., "500g", "1 stk")
            let productAmount = parseProductAmount(offer.amount, offer.unit)
            // Fallback: some offers miss structured amount/unit but include it in name (e.g. "ØKO. SALAT MIX 75 g")
            if (!productAmount) {
              productAmount = parseAmountFromNameStore(String(offer.name_store || ''))
            }
            if (!productAmount) continue

            const gramsPerUnit =
              (ingredientId ? gramsPerUnitMap.get(ingredientId) : undefined) ??
              gramsPerUnitByNameMap.get(normalizeName(String(item.name || '')))
            // Convert to same unit if possible (use ingredient's grams_per_unit for g <-> stk)
            let convertedAmount = convertToUnit(productAmount.value, productAmount.unit, neededUnit, gramsPerUnit)

            // If conversion failed, try matching same unit (e.g., "bundt" to "bundt")
            if (convertedAmount === null) {
              const normalizedProductUnit = productAmount.unit.toLowerCase().trim()
              const normalizedNeededUnit = neededUnit.toLowerCase().trim()

              // If units match exactly (after normalization), use product amount directly
              if (normalizedProductUnit === normalizedNeededUnit) {
                convertedAmount = productAmount.value
              } else {
                // Can't match - skip this product
                continue
              }
            }

            // Skip invalid conversions (prevents divide-by-zero and absurd quantities)
            if (!Number.isFinite(convertedAmount) || convertedAmount <= 0) {
              continue
            }

            // Calculate how many units are needed
            const quantityNeeded = convertedAmount >= neededAmount 
              ? 1 
              : Math.ceil(neededAmount / convertedAmount)

            // Sanity guard: ignore clearly broken package calculations
            if (!Number.isFinite(quantityNeeded) || quantityNeeded <= 0 || quantityNeeded > 120) {
              continue
            }
            
            // Calculate total price (price per unit * quantity needed)
            const totalPrice = (offer.current_price || 0) * quantityNeeded
            
            // Calculate excess amount (waste) - prefer less waste when prices are equal
            const totalAmount = convertedAmount * quantityNeeded
            const excess = totalAmount - neededAmount

            // Skip if no price available
            if (!offer.current_price || totalPrice === 0) continue

            const offerIsActive = offer.is_offer_active === true
              ? true
              : !!offer.is_on_sale || (offer.normal_price && offer.current_price && offer.normal_price > offer.current_price)

            // Choose product with lowest total price
            // If prices are equal (within 0.01 kr), prefer:
            // 1. Less excess (less waste)
            // 2. Products on sale
            // 3. Products that exactly match or are closer to needed amount
            const priceDifference = Math.abs(totalPrice - bestTotalPrice)
            const isBetterPrice = totalPrice < bestTotalPrice
            const isSimilarPrice = priceDifference < 0.01 && totalPrice <= bestTotalPrice
            
            let shouldUpdate = false
            
            if (isBetterPrice) {
              // Definitely better price
              shouldUpdate = true
            } else if (isSimilarPrice) {
              // Similar price - use tie-breakers
              if (excess < bestExcess) {
                // Less waste
                shouldUpdate = true
              } else if (excess === bestExcess && offerIsActive && !bestProduct?.isOnSale) {
                // Same waste, but this one is on sale
                shouldUpdate = true
              } else if (excess === bestExcess && convertedAmount >= neededAmount && bestProduct?.productAmount < neededAmount) {
                // Same waste, but this one is sufficient in one unit
                shouldUpdate = true
              }
            }

            if (shouldUpdate) {
              bestTotalPrice = totalPrice
              bestExcess = excess
              
              const totalNormalPrice = offer.normal_price ? offer.normal_price * quantityNeeded : null
              
              // Calculate discount percentage if on sale
              let discountPercentage = offer.discount_percentage
              if (offerIsActive && offer.normal_price && offer.current_price && offer.normal_price > offer.current_price) {
                discountPercentage = Math.round(((offer.normal_price - offer.current_price) / offer.normal_price) * 100)
              }
              
              bestProduct = {
                product_external_id: match.product_external_id,
                name: offer.name_store,
                price: offer.current_price, // Price per unit
                totalPrice: totalPrice, // Total price for quantity needed
                normalPrice: offer.normal_price, // Normal price per unit
                totalNormalPrice: totalNormalPrice, // Total normal price for quantity needed
                isOnSale: offerIsActive,
                discountPercentage: discountPercentage,
                amount: offer.amount,
                unit: offer.unit,
                productAmount: convertedAmount,
                neededAmount: neededAmount,
                quantityNeeded: quantityNeeded, // How many units to buy
                isSufficient: convertedAmount >= neededAmount
              }
            }
          }
        }

        if (bestProduct) {
          result[storeKey][shoppingItemName] = bestProduct
          itemsWithProducts++
        } else {
          itemsWithoutProducts++
          // Only log if there were matches but no offers found
          if (matchesForIngredient.length > 0) {
            const matchedProductIds = matchesForIngredient.map(m => m.product_external_id)
            const offersForMatchedProducts = matchedProductIds
              .map(id => productOffersMap.get(id) || [])
              .flat()
            const storeOffers = offersForMatchedProducts.filter((o: any) => o.store_id === storeId)
            console.log(`⚠️ "${shoppingItemName}" in ${storeId}: ${matchesForIngredient.length} matches, ${offersForMatchedProducts.length} total offers, ${storeOffers.length} for this store`)
          }
        }
      }
    }

    console.log(`🔍 Step 7: Results - ${itemsWithProducts} items with products, ${itemsWithoutProducts} without`)
    console.log(`📊 Stores in result: ${Object.keys(result).join(', ') || 'none'}`)
    console.log(`📊 Total items per store:`, Object.entries(result).map(([store, items]) => `${store}: ${Object.keys(items).length}`).join(', ') || 'none')

    // Include debug info in response if no products found
    const debugInfo = itemsWithProducts === 0 ? {
      ingredientIdsCount: ingredientIds.length,
      productMatchesCount: allMatches.length,
      offersCount: totalOffersFound,
      storesSearched: dbStoreIds,
      message: 'No products found - check if product_ingredient_matches exist for these ingredients'
    } : undefined

    return NextResponse.json({
      success: true,
      data: result,
      ...(debugInfo && { debug: debugInfo })
    })
  } catch (error: any) {
    console.error('Error in shopping-list-prices API:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Parse product amount string (e.g., "500g", "1 stk", "250 ml") into value and unit
 */
function parseProductAmount(amount: string | number | null, unit: string | null): { value: number, unit: string } | null {
  // If amount is a number, use it directly
  if (typeof amount === 'number' && !isNaN(amount)) {
    return {
      value: amount,
      unit: (unit || '').toLowerCase().trim() || 'stk'
    }
  }

  if (!amount && !unit) return null

  // Convert amount to string if it's not null/undefined
  const amountStr = amount !== null && amount !== undefined ? String(amount) : null

  // If we have both amount string and unit, use them
  if (amountStr && unit) {
    const num = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(num)) return null
    return { value: num, unit: unit.toLowerCase() }
  }

  // Try to parse from amount string (e.g., "500g", "1 stk")
  if (amountStr) {
    const match = amountStr.match(/^([\d.,]+)\s*([a-zæøå]+)?$/i)
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'))
      if (isNaN(num)) return null
      const parsedUnit = (match[2] || unit || '').toLowerCase().trim()
      return { value: num, unit: parsedUnit || 'stk' }
    }
  }

  return null
}

/**
 * Parse amount/unit from product display name as fallback
 * Examples: "ØKO. SALAT MIX 75 g", "SKRABEÆG 10 stk", "HVIDKÅL 1 kg"
 */
function parseAmountFromNameStore(name: string): { value: number, unit: string } | null {
  if (!name) return null
  const normalized = name.toLowerCase().replace(',', '.')

  // Prefer explicit unit-bearing numbers near the end of the string
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|stk|styk|stykker|ml|l)\b/)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null

  const rawUnit = match[2]
  let unit = rawUnit
  if (rawUnit === 'gram') unit = 'g'
  if (rawUnit === 'styk' || rawUnit === 'stykker') unit = 'stk'

  return { value, unit }
}

/**
 * Convert amount to target unit (simplified - only handles common conversions).
 * gramsPerUnit: optional weight in gram per 1 stk (from ingredients.grams_per_unit) for g <-> stk.
 */
function convertToUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  gramsPerUnit?: number
): number | null {
  // Normalize units
  const normalize = (unit: string) => {
    unit = unit.toLowerCase().trim()
    // Handle noisy units from stores, e.g. "kg / vej selv", "gram pr pose", "stk/pk"
    if (/\bkg\b|\bkilo\b|\bkilogram\b/.test(unit)) return 'kg'
    if (/\bg\b|\bgram\b/.test(unit)) return 'g'
    if (/\bml\b|\bmilliliter\b/.test(unit)) return 'ml'
    if (/\bl\b|\bliter\b/.test(unit)) return 'l'
    if (/\bstk\b|\bstyk\b|\bstykker\b/.test(unit)) return 'stk'
    // Common cooking units
    if (/\bspsk\b|spiseskefuld|spiseskefulde/.test(unit)) return 'spsk'
    if (/\btsk\b|teskefuld|teskefulde/.test(unit)) return 'tsk'
    if (/\bbundt\b|\bbundter\b/.test(unit)) return 'bundt'
    return unit
  }

  const from = normalize(fromUnit)
  const to = normalize(toUnit)

  // Same unit
  if (from === to) return value

  // g <-> stk using ingredient's standard weight per piece (e.g. rødløg 80 g/stk)
  if (gramsPerUnit != null && gramsPerUnit > 0) {
    if (from === 'g' && to === 'stk') return value / gramsPerUnit
    if (from === 'stk' && to === 'g') return value * gramsPerUnit
    if (from === 'kg' && to === 'stk') return (value * 1000) / gramsPerUnit
    if (from === 'stk' && to === 'kg') return (value * gramsPerUnit) / 1000
  }

  // Weight conversions
  if (from === 'kg' && to === 'g') return value * 1000
  if (from === 'g' && to === 'kg') return value / 1000

  // Volume conversions
  if (from === 'l' && to === 'ml') return value * 1000
  if (from === 'ml' && to === 'l') return value / 1000

  // Cooking unit conversions (approximate)
  if (from === 'spsk' && to === 'g') return value * 15
  if (from === 'spsk' && to === 'ml') return value * 15
  if (from === 'tsk' && to === 'g') return value * 5
  if (from === 'tsk' && to === 'ml') return value * 5
  if (from === 'bundt' && to === 'g') return value * 25
  if (from === 'g' && to === 'spsk') return value / 15
  if (from === 'g' && to === 'tsk') return value / 5
  if (from === 'g' && to === 'bundt') return value / 25
  if (from === 'ml' && to === 'spsk') return value / 15
  if (from === 'ml' && to === 'tsk') return value / 5

  return null
}
