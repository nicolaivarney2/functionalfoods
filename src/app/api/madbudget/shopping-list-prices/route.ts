import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { getGomaSunsetStatus, isGomaLegacyDataEnabled } from '@/lib/goma-sunset'
import { isFooddataProductExternalId } from '@/lib/product-match-snapshots'
import {
  comparisonPriceForOrganicPreference,
  resolveProductOrganicTags,
  type OrganicPreferenceInput,
} from '@/lib/madbudget/organic-preference'
import {
  applyGuidePricesForOfferStores,
  anySelectedStoreNeedsGuidePrices,
  GUIDE_PRICE_REFERENCE_STORE_IDS,
  storeNeedsGuidePrices,
  stripUnrequestedReferenceStores,
} from '@/lib/madbudget/guide-prices'
import {
  buildSnapshotProduct,
  canonicalNeededAmount,
  computePackageQuantity,
  normalizeShoppingUnit,
  parseAmountFromNameStore,
  parseProductAmount,
  selectMatchesForStore,
} from '@/lib/madbudget/shopping-list-pricing'

/**
 * API endpoint to fetch best matching products with prices for shopping list items
 * per selected store.
 * 
 * This endpoint:
 * 1. Takes shopping list items (ingredient names + amounts)
 * 2. Takes selected store IDs
 * 3. Finds best matching products from product_ingredient_matches (fooddata keys first)
 * 4. Loads live prices from products + product_offers (fooddata catalog in FF cache)
 * 5. Filters by store and matches volume (closest >= needed, or largest if insufficient)
 * 6. Snapshot fallback only for fooddata matches in the same store (no Goma/name guessing)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shoppingListItems, selectedStoreIds, organicPreferences } = body
    const organicPrefs: OrganicPreferenceInput = {
      prioritizeOrganic: organicPreferences?.prioritizeOrganic === true,
      prioritizeAnimalOrganic: organicPreferences?.prioritizeAnimalOrganic === true,
    }

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

    // Map frontend store IDs to a canonical UI key + possible DB slug aliases.
    // We support both legacy slugs (føtex/løvbjerg) and ASCII slugs (fotex/lovbjerg).
    // Id 1–9 er de oprindelige madbudget-kæder; id 10–15 er Tjek-tilbuds-kæder
    // tilføjet for at synkronisere madbudget med /dagligvarer (14 butikker total).
    const storeIdMap: Record<number, { key: string; candidates: string[] }> = {
      1: { key: 'rema-1000', candidates: ['rema-1000'] },
      2: { key: 'netto', candidates: ['netto'] },
      3: { key: 'føtex', candidates: ['føtex', 'foetex', 'fotex'] },
      4: { key: 'bilka', candidates: ['bilka'] },
      5: { key: 'nemlig', candidates: ['nemlig'] },
      6: { key: 'meny', candidates: ['meny'] },
      7: { key: 'spar', candidates: ['spar'] },
      8: { key: 'løvbjerg', candidates: ['loevbjerg', 'løvbjerg', 'lovbjerg'] },
      9: { key: 'min-koebmand', candidates: ['min-koebmand'] },
      10: { key: 'lidl', candidates: ['lidl'] },
      11: { key: '365discount', candidates: ['365discount', '365-discount'] },
      12: { key: 'kvickly', candidates: ['kvickly'] },
      13: { key: 'superbrugsen', candidates: ['superbrugsen', 'super-brugsen'] },
      14: { key: 'brugsen', candidates: ['brugsen'] },
      15: { key: 'abc-lavpris', candidates: ['abc-lavpris'] },
    }

    const requestedStores = selectedStoreIds
      .map((id: number) => storeIdMap[id])
      .filter((s): s is { key: string; candidates: string[] } => Boolean(s))
    const requestedStoreKeys = Array.from(new Set(requestedStores.map((s) => s.key)))

    // Tilbuds-butikker: prissæt også REMA + Netto internt til vejledende priser
    const storesForPricing = [...requestedStores]
    if (anySelectedStoreNeedsGuidePrices(requestedStoreKeys)) {
      for (const refId of GUIDE_PRICE_REFERENCE_STORE_IDS) {
        const refStore = storeIdMap[refId]
        if (refStore && !requestedStoreKeys.includes(refStore.key)) {
          storesForPricing.push(refStore)
        }
      }
    }

    const storeKeys = Array.from(new Set(storesForPricing.map((s) => s.key)))
    const storeCandidatesByKey = new Map<string, string[]>()
    storesForPricing.forEach((s) => {
      storeCandidatesByKey.set(s.key, s.candidates)
    })
    const dbStoreIds = Array.from(
      new Set(storesForPricing.flatMap((s) => s.candidates))
    )

    const normalizeStoreKey = (v: string): string =>
      String(v || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    const canonicalStoreKey = (raw: string): string => {
      const n = normalizeStoreKey(raw)
      if (n === 'fotex' || n === 'foetex' || n === 'føtex') return 'føtex'
      if (n === 'loevbjerg' || n === 'lovbjerg' || n === 'løvbjerg') return 'løvbjerg'
      return raw
    }

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

    // Lazy: kun hent alle ingredienser når navne-match er nødvendigt (dyrt).
    let allIngredientsMeta: { id: string; name: string; grams_per_unit?: number | null }[] | null = null
    const loadAllIngredientsMeta = async () => {
      if (allIngredientsMeta) return allIngredientsMeta
      const { data } = await supabase.from('ingredients').select('id, name, grams_per_unit').limit(5000)
      allIngredientsMeta = data ?? []
      return allIngredientsMeta
    }

    const gramsPerUnitByNameMap = new Map<string, number>()
    
    console.log(`🔍 Step 1: Extracted ${ingredientIds.length} unique ingredientIds from ${shoppingListItems.length} items`)
    
    if (ingredientIds.length === 0) {
      const meta = await loadAllIngredientsMeta()
      meta.forEach((row) => {
        if (row.grams_per_unit != null && Number(row.grams_per_unit) > 0) {
          gramsPerUnitByNameMap.set(normalizeName(row.name), Number(row.grams_per_unit))
        }
      })
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
        let match = meta.find((ing: any) => ing.name.toLowerCase() === itemName)
        
        // Try normalized match
        if (!match) {
          match = meta.find((ing: any) => {
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

    // Per-item fallback kun for varer uden ingredientId.
    const itemsMissingId = shoppingListItems.filter((item: any) => !item.ingredientId && item.name)
    if (itemsMissingId.length > 0) {
      const meta = await loadAllIngredientsMeta()

      if (meta.length > 0) {
        for (const item of itemsMissingId) {
          const itemName = item.name?.toLowerCase().trim()
          if (!itemName) continue

          const normalizedItemName = normalizeName(itemName)
          let match = meta.find((ing: any) => normalizeName(ing.name) === normalizedItemName)
          if (!match) {
            const candidates = meta
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
          confidence,
          product_name_snapshot,
          product_store_snapshot,
          last_known_price
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

    const gomaSunset = getGomaSunsetStatus()
    const pricingMatches = isGomaLegacyDataEnabled()
      ? allMatches
      : allMatches.filter((m) => isFooddataProductExternalId(m.product_external_id))

    if (!isGomaLegacyDataEnabled() && pricingMatches.length < allMatches.length) {
      console.log(
        `🌅 GOMA_SIMULATE_GONE: ignorerer ${allMatches.length - pricingMatches.length} legacy matches — kun fooddata-nøgler`,
      )
    }

    // Index matches by ingredient id — prefer fooddata product keys over legacy Goma ids
    const matchesByIngredient = new Map<string, any[]>()
    for (const match of pricingMatches) {
      const id = String(match.ingredient_id || '')
      if (!id) continue
      const list = matchesByIngredient.get(id)
      if (list) list.push(match)
      else matchesByIngredient.set(id, [match])
    }
    if (pricingMatches.length === 0) {
      console.log('⚠️ No product matches found in database for these ingredientIds')
      console.log(`📋 Sample ingredientIds that were searched:`, ingredientIds.slice(0, 5))
      return NextResponse.json({
        success: true,
        data: {}, // No product matches found
        gomaSunset,
        debug: {
          ingredientIdsCount: ingredientIds.length,
          sampleIngredientIds: ingredientIds.slice(0, 5),
          message: gomaSunset.simulateGone
            ? 'Ingen fooddata-matches — legacy Goma matches ignoreres (GOMA_SIMULATE_GONE)'
            : 'No product_ingredient_matches found for these ingredients',
        },
      })
    }

    // Get unique product external IDs
    const productExternalIds = Array.from(
      new Set(pricingMatches.map(m => m.product_external_id).filter(Boolean))
    )

    console.log(`🔍 Step 3: Found ${productExternalIds.length} unique products from matches`)
    console.log(`🔍 Step 4: Looking for prices in stores: ${dbStoreIds.join(', ')}`)

    const chunkSize = 200
    const productOrganicTagsMap = new Map<string, string[]>()
    for (let i = 0; i < productExternalIds.length; i += chunkSize) {
      const chunk = productExternalIds.slice(i, i + chunkSize)
      const fooddataChunk = chunk.filter((id) => isFooddataProductExternalId(id))
      const legacyChunk = isGomaLegacyDataEnabled()
        ? chunk.filter((id) => !isFooddataProductExternalId(id))
        : []

      if (fooddataChunk.length > 0) {
        const { data: byId } = await supabase
          .from('products')
          .select('id, organic_tags')
          .in('id', fooddataChunk)
        byId?.forEach((row) => {
          productOrganicTagsMap.set(
            row.id,
            resolveProductOrganicTags(row.organic_tags)
          )
        })
      }

      if (legacyChunk.length > 0) {
        const { data: byExternal } = await supabase
          .from('products')
          .select('external_id, organic_tags')
          .in('external_id', legacyChunk)
        byExternal?.forEach((row) => {
          if (row.external_id) {
            productOrganicTagsMap.set(
              row.external_id,
              resolveProductOrganicTags(row.organic_tags)
            )
          }
        })
      }
    }

    // Fetch live offers from fooddata catalog (products + product_offers in FF cache)
    const productOffersMap = new Map<string, any[]>()
    let totalOffersFound = 0

    for (let i = 0; i < productExternalIds.length; i += chunkSize) {
      const chunk = productExternalIds.slice(i, i + chunkSize)

      // Fooddata-style: products.id = {chain}-{source_id}
      const { data: productsById, error: productsByIdError } = await supabase
        .from('products')
        .select('id, amount, unit')
        .in('id', chunk)

      if (!productsByIdError && productsById && productsById.length > 0) {
        const productIdToExternalId = new Map<string, string>()
        const productIdToAmount = new Map<string, { amount: string | null, unit: string | null }>()
        productsById.forEach(p => {
          productIdToExternalId.set(p.id, p.id)
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
                store_id: canonicalStoreKey(String(offer.store_id || '')),
                amount: amountInfo?.amount ?? offer.amount,
                unit: amountInfo?.unit ?? offer.unit
              })
            })
          }
        }
      }

      // Legacy Goma: products.external_id (only when match id is not a fooddata key)
      const legacyChunk = isGomaLegacyDataEnabled()
        ? chunk.filter((id) => !isFooddataProductExternalId(id))
        : []
      const { data: products, error: productsError } = legacyChunk.length > 0
        ? await supabase
            .from('products')
            .select('id, external_id, amount, unit')
            .in('external_id', legacyChunk)
        : { data: [], error: null }

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
                store_id: canonicalStoreKey(String(offer.store_id || '')),
                amount: amountInfo?.amount ?? offer.amount,
                unit: amountInfo?.unit ?? offer.unit
              })
            })
          } else if (offersError) {
            console.error('❌ Error fetching product_offers:', offersError)
          }
        }
      }

      // Goma: product_offers.store_product_id — skip under GOMA_SIMULATE_GONE
      if (isGomaLegacyDataEnabled()) {
        const legacyStoreProductChunk = chunk.filter((id) => !isFooddataProductExternalId(id))
        if (legacyStoreProductChunk.length > 0) {
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
        .in('store_product_id', legacyStoreProductChunk)
        .in('store_id', dbStoreIds)
        .eq('is_available', true)

      if (!offersByStoreProductIdError && offersByStoreProductId) {
        totalOffersFound += offersByStoreProductId.length
        const externalIdToProductIds = new Map<string, Set<string>>()

        offersByStoreProductId.forEach(offer => {
          const externalId = offer.store_product_id
          if (!externalId) return

          if (!productOffersMap.has(externalId)) {
            productOffersMap.set(externalId, [])
          }

           if (offer.product_id) {
            const existing = externalIdToProductIds.get(externalId) || new Set<string>()
            existing.add(String(offer.product_id))
            externalIdToProductIds.set(externalId, existing)
          }

          productOffersMap.get(externalId)!.push({
            ...offer,
            product_external_id: externalId,
            store_id: canonicalStoreKey(String(offer.store_id || '')),
          })
        })

        // Critical: product_ingredient_matches often stores a store-specific external id.
        // Resolve that id to product_id and then load offers for the same product across
        // all selected stores, so Føtex/Løvbjerg can participate in cross-store pricing.
        const linkedProductIds = Array.from(
          new Set(
            Array.from(externalIdToProductIds.values()).flatMap((ids) => Array.from(ids))
          )
        )

        if (linkedProductIds.length > 0) {
          const { data: linkedOffers, error: linkedOffersError } = await supabase
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
            .in('product_id', linkedProductIds)
            .in('store_id', dbStoreIds)
            .eq('is_available', true)

          if (!linkedOffersError && linkedOffers) {
            totalOffersFound += linkedOffers.length
            const offersByProductId = new Map<string, any[]>()
            linkedOffers.forEach((offer) => {
              const pid = String(offer.product_id || '')
              if (!pid) return
              const list = offersByProductId.get(pid)
              if (list) list.push(offer)
              else offersByProductId.set(pid, [offer])
            })

            for (const [externalId, productIds] of externalIdToProductIds.entries()) {
              if (!productOffersMap.has(externalId)) {
                productOffersMap.set(externalId, [])
              }
              const target = productOffersMap.get(externalId)!
              const seenOfferIds = new Set(target.map((o: any) => String(o.id || '')))

              for (const pid of productIds) {
                const offersForPid = offersByProductId.get(pid) || []
                for (const offer of offersForPid) {
                  const offerId = String(offer.id || '')
                  if (offerId && seenOfferIds.has(offerId)) continue
                  if (offerId) seenOfferIds.add(offerId)

                  target.push({
                    ...offer,
                    product_external_id: externalId,
                    store_id: canonicalStoreKey(String(offer.store_id || '')),
                  })
                }
              }
            }
          } else if (linkedOffersError) {
            console.error('❌ Error fetching linked product_offers by product_id:', linkedOffersError)
          }
        }
      } else if (offersByStoreProductIdError) {
        console.error('❌ Error fetching product_offers by store_product_id:', offersByStoreProductIdError)
      }
        }
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
      if (item.isBasis) continue
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
      for (const storeKey of storeKeys) {

        if (!result[storeKey]) {
          result[storeKey] = {}
        }

        // Find best product for this ingredient in this store
        // Strategy: lowest effective price; øko-præference giver op til 10 % premium
        let bestProduct: any = null
        let bestComparisonPrice = Infinity
        let bestExcess = Infinity // For tie-breaking: prefer less waste
        const neededRaw = Number(String(item.amount ?? '0').replace(',', '.')) || 0
        const neededUnitRaw = normalizeShoppingUnit(item.unit?.toLowerCase() || '')
        const { amount: neededAmount, unit: neededUnit } = canonicalNeededAmount(
          neededRaw,
          neededUnitRaw
        )

        const storeMatches = selectMatchesForStore(matchesForIngredient, storeKey)

        for (const match of storeMatches) {
            const storeOffers = productOffersByStore.get(match.product_external_id)?.get(storeKey) || []

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
            const packQty = computePackageQuantity(
              neededAmount,
              neededUnit,
              productAmount.value,
              productAmount.unit,
              gramsPerUnit
            )
            if (!packQty) continue
            const { quantityNeeded, convertedAmount } = packQty
            
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
            const organicTags = resolveProductOrganicTags(
              productOrganicTagsMap.get(match.product_external_id),
              offer.name_store
            )
            const comparisonPrice = comparisonPriceForOrganicPreference(
              totalPrice,
              organicPrefs,
              organicTags
            )
            const priceDifference = Math.abs(comparisonPrice - bestComparisonPrice)
            const isBetterPrice = comparisonPrice < bestComparisonPrice
            const isSimilarPrice = priceDifference < 0.01 && comparisonPrice <= bestComparisonPrice
            
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
              bestComparisonPrice = comparisonPrice
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
                isSufficient: convertedAmount >= neededAmount,
                pricingSource: 'fooddata_offer',
                isOrganicMatch: organicTags.length > 0,
              }
            }
          }
        }

        // Sidste udvej: kurateret match med snapshot-pris for denne butik
        if (!bestProduct && !storeNeedsGuidePrices(storeKey)) {
          for (const match of storeMatches) {
            if (!match.product_name_snapshot || match.last_known_price == null) continue
            const snapshotPrice = Number(match.last_known_price)
            if (!Number.isFinite(snapshotPrice) || snapshotPrice <= 0) continue
            const gramsPerUnit =
              (ingredientId ? gramsPerUnitMap.get(ingredientId) : undefined) ??
              gramsPerUnitByNameMap.get(normalizeName(String(item.name || '')))
            const built = buildSnapshotProduct(match, {
              snapshotPrice,
              neededAmount,
              neededUnit,
              storeKey,
              gramsPerUnit,
              productOrganicTagsMap,
              organicPrefs,
            })
            if (built) {
              bestProduct = built.product
              break
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
            const storeOffers = offersForMatchedProducts.filter((o: any) => o.store_id === storeKey)
            console.log(`⚠️ "${shoppingItemName}" in ${storeKey}: ${matchesForIngredient.length} matches, ${offersForMatchedProducts.length} total offers, ${storeOffers.length} for this store`)
          }
        }
      }
    }

    console.log(`🔍 Step 7: Results - ${itemsWithProducts} items with products, ${itemsWithoutProducts} without`)
    console.log(`📊 Stores in result: ${Object.keys(result).join(', ') || 'none'}`)
    console.log(`📊 Total items per store:`, Object.entries(result).map(([store, items]) => `${store}: ${Object.keys(items).length}`).join(', ') || 'none')

    const guideCount = applyGuidePricesForOfferStores(
      result,
      requestedStoreKeys,
      shoppingListItems
    )
    stripUnrequestedReferenceStores(result, requestedStoreKeys)

    if (guideCount > 0) {
      console.log(`📎 Guide prices: filled ${guideCount} missing items for offer-only stores`)
    }

    // Include debug info in response if no products found
    const debugInfo = itemsWithProducts === 0 ? {
      ingredientIdsCount: ingredientIds.length,
      productMatchesCount: pricingMatches.length,
      legacyMatchesIgnored: gomaSunset.simulateGone ? allMatches.length - pricingMatches.length : 0,
      offersCount: totalOffersFound,
      storesSearched: dbStoreIds,
      message: gomaSunset.simulateGone
        ? 'Ingen fooddata-priser fundet — tjek at matches og katalog-import er kørt'
        : 'No products found - check if product_ingredient_matches exist for these ingredients',
    } : undefined

    return NextResponse.json({
      success: true,
      data: result,
      guideCount,
      gomaSunset,
      ...(debugInfo && { debug: debugInfo }),
    })
  } catch (error: any) {
    console.error('Error in shopping-list-prices API:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
