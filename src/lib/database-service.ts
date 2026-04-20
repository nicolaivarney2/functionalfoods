import { createSupabaseClient } from './supabase'
import { Recipe } from '@/types/recipe'
import { IngredientTag } from '@/lib/ingredient-system/types'
import { SupermarketProduct } from '@/lib/supermarket-scraper/types'

export class DatabaseService {
  private readonly RECIPES_CACHE_TTL_MS = 60_000
  private publishedRecipesCache: { data: Recipe[]; expiresAt: number } | null = null
  private allRecipesCache: { data: Recipe[]; expiresAt: number } | null = null

  /** Short TTL: counts change nightly; avoids repeated heavy work on page refresh. */
  private readonly PRODUCT_COUNTS_CACHE_TTL_MS = 45_000
  private productCountsCache: {
    data: { total: number; categories: { [key: string]: number }; offers: number }
    expiresAt: number
  } | null = null

  private readonly CATEGORY_NORMALIZATION_MAP: Record<string, string> = {
    'frugt & grønt': 'Frugt og grønt',
    'frugt og grønt': 'Frugt og grønt',
    'brød & kager': 'Brød og kager',
    'brød og kager': 'Brød og kager',
    'drikkevarer': 'Drikkevarer',
    'kød, fisk & fjerkræ': 'Kød og fisk',
    'kød og fisk': 'Kød og fisk',
    'kolonial': 'Kolonial',
    'mejeri': 'Mejeri og køl',
    'mejeri og køl': 'Mejeri og køl',
    'ost & mejeri': 'Mejeri og køl',
    'nemt & hurtigt': 'Nemt og hurtigt',
    'nemt og hurtigt': 'Nemt og hurtigt',
    'snacks & slik': 'Slik og snacks',
    'slik og snacks': 'Slik og snacks',
    'personlig pleje': 'Personlig pleje',
    'husholdning & rengøring': 'Husholdning',
    'husholdning': 'Husholdning',
    'baby og småbørn': 'Baby og familie',
    'baby og familie': 'Baby og familie',
    'frost': 'Frost',
    'kiosk': 'Kiosk',
    'dyr': 'Dyr'
  }

  private readonly FOOD_ONLY_CATEGORIES = [
    'Frugt og grønt',
    'Brød og kager',
    'Kød og fisk',
    'Kolonial',
    'Mejeri og køl',
    'Nemt og hurtigt',
  ]

  /**
   * Ekstra department-strenge fra Goma/REMA m.fl. der er fødevarer, men ikke identiske med FOOD_ONLY_CATEGORIES.
   * Bruges når "Kun fødevarer" er valgt uden kategori — filtrering sker på join (ikke findProductIdsForCategories),
   * ellers mangler fx REMA-varer med "Køl", "Frost", "Kød & fisk" osv.
   */
  private readonly FOOD_ONLY_DEPARTMENT_EXTRA = [
    'Frost',
    'Køl',
    'Mejeri',
    'Ost m.v.',
    'Kød & fisk',
    'Kød, fisk & fjerkræ',
    'Brød',
    'Frugt & grønt',
  ] as const
  /**
   * Get published recipes from database (for frontend use)
   */
  async getRecipes(): Promise<Recipe[]> {
    const now = Date.now()
    if (this.publishedRecipesCache && this.publishedRecipesCache.expiresAt > now) {
      return this.publishedRecipesCache.data
    }

    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('status', 'published') // Only show published recipes to frontend
      .order('updatedAt', { ascending: false })
    
    if (error) {
      console.error('Error fetching published recipes:', error)
      return []
    }

    const recipes = data || []
    this.publishedRecipesCache = {
      data: recipes,
      expiresAt: now + this.RECIPES_CACHE_TTL_MS,
    }
    return recipes
  }

  /**
   * Get all recipes from database (including drafts) - for admin use only
   */
  async getAllRecipes(): Promise<Recipe[]> {
    const now = Date.now()
    if (this.allRecipesCache && this.allRecipesCache.expiresAt > now) {
      return this.allRecipesCache.data
    }

    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('updatedAt', { ascending: false })
    
    if (error) {
      console.error('Error fetching all recipes:', error)
      return []
    }

    const recipes = data || []
    this.allRecipesCache = {
      data: recipes,
      expiresAt: now + this.RECIPES_CACHE_TTL_MS,
    }
    return recipes
  }

  async getPublishedRecipeBySlug(slug: string): Promise<Recipe | null> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('Error fetching published recipe by slug:', error)
      return null
    }
    return (data as Recipe | null) || null
  }

  async getRecentPublishedRecipes(limit: number = 80, excludeSlug?: string): Promise<Recipe[]> {
    const supabase = createSupabaseClient()
    let query = supabase
      .from('recipes')
      .select('*')
      .eq('status', 'published')
      .order('updatedAt', { ascending: false })
      .limit(limit)

    if (excludeSlug) {
      query = query.neq('slug', excludeSlug)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching recent published recipes:', error)
      return []
    }
    return data || []
  }

  clearRecipeCaches(): void {
    this.publishedRecipesCache = null
    this.allRecipesCache = null
  }

  /**
   * Get all ingredients from database
   */
  async getIngredients(): Promise<IngredientTag[]> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
    
    if (error) {
      console.error('Error fetching ingredients:', error)
      return []
    }
    
    // Transform snake_case database fields to camelCase for frontend
    const transformedIngredients = (data || []).map(ingredient => ({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      description: ingredient.description,
      exclusions: ingredient.exclusions || [],
      allergens: ingredient.allergens || [],
      commonNames: ingredient.common_names || [],
      isActive: ingredient.is_active ?? true,
      createdAt: new Date(ingredient.created_at),
      updatedAt: new Date(ingredient.updatedAt || ingredient.createdAt)
    }))
    
    return transformedIngredients
  }

  private parseProductCountsRpc(data: unknown): {
    total: number
    categories: { [key: string]: number }
    offers: number
  } | null {
    if (data == null) return null
    let obj: Record<string, unknown> = {}
    if (typeof data === 'string') {
      try {
        obj = JSON.parse(data) as Record<string, unknown>
      } catch {
        return null
      }
    } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      obj = data as Record<string, unknown>
    } else {
      return null
    }
    const total = Number(obj.total)
    const offers = Number(obj.offers)
    if (!Number.isFinite(total) || !Number.isFinite(offers)) return null
    const categories: { [key: string]: number } = {}
    const rawCats = obj.categories
    if (rawCats && typeof rawCats === 'object' && rawCats !== null && !Array.isArray(rawCats)) {
      for (const [k, v] of Object.entries(rawCats as Record<string, unknown>)) {
        const n = Number(v)
        if (Number.isFinite(n)) categories[k] = n
      }
    }
    return { total, offers, categories }
  }

  /**
   * Legacy: many batched selects (slow on large catalogs). Kept as fallback if RPC is missing.
   */
  private async getProductCountsV2Legacy(): Promise<{
    total: number
    categories: { [key: string]: number }
    offers: number
  }> {
    try {
      const supabase = createSupabaseClient()

      const { count: totalCount, error: totalError } = await supabase
        .from('product_offers')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)

      if (totalError) {
        console.error('Error getting total count (V2):', totalError)
        return { total: 0, categories: {}, offers: 0 }
      }

      let allCategoryData: any[] = []
      let start = 0
      const batchSize = 1000
      const total = totalCount || 0

      while (start < total) {
        const end = Math.min(start + batchSize - 1, total - 1)
        const { data: batchData, error: batchError } = await supabase
          .from('product_offers')
          .select(`
            products:product_id (
              department,
              category
            )
          `)
          .eq('is_available', true)
          .range(start, end)

        if (batchError) {
          console.error(`Error getting category batch ${start}-${end}:`, batchError)
          break
        }

        if (batchData) {
          allCategoryData = [...allCategoryData, ...batchData]
        }

        start += batchSize

        if (start > 50000) {
          console.warn('Breaking category fetch at 50000 to prevent infinite loop')
          break
        }
      }

      const categoryCounts = allCategoryData.reduce((acc: { [key: string]: number }, offer: any) => {
        const product = offer.products || {}
        const category = product.department || product.category || 'Ukategoriseret'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {})

      const { count: offersCount, error: offersError } = await supabase
        .from('product_offers')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)
        .eq('is_offer_active', true)

      if (offersError) {
        console.error('Error getting offers count (V2):', offersError)
      }

      return {
        total: totalCount || 0,
        categories: categoryCounts,
        offers: offersCount || 0,
      }
    } catch (error) {
      console.error('Error in getProductCountsV2Legacy:', error)
      return { total: 0, categories: {}, offers: 0 }
    }
  }

  /**
   * NEW: Get product counts from new structure (product_offers + products).
   * Prefers Postgres RPC (single query); falls back to legacy batched reads if RPC unavailable.
   */
  async getProductCountsV2(): Promise<{ total: number; categories: { [key: string]: number }; offers: number }> {
    const now = Date.now()
    if (this.productCountsCache && this.productCountsCache.expiresAt > now) {
      return this.productCountsCache.data
    }

    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.rpc('get_product_counts_v2')
      if (!error && data != null) {
        const parsed = this.parseProductCountsRpc(data)
        if (parsed) {
          this.productCountsCache = {
            data: parsed,
            expiresAt: now + this.PRODUCT_COUNTS_CACHE_TTL_MS,
          }
          return parsed
        }
      }
      if (error) {
        console.warn('get_product_counts_v2 RPC unavailable, using legacy counts:', error.message)
      }
    } catch (e) {
      console.warn('get_product_counts_v2 RPC exception, using legacy counts:', e)
    }

    const legacy = await this.getProductCountsV2Legacy()
    this.productCountsCache = {
      data: legacy,
      expiresAt: now + this.PRODUCT_COUNTS_CACHE_TTL_MS,
    }
    return legacy
  }

  /**
   * Get optimized product counts and category breakdown without fetching full products
   * @deprecated Use getProductCountsV2() instead
   */
  async getProductCounts(): Promise<{total: number, categories: {[key: string]: number}, offers: number}> {
    // Use new V2 method
    return this.getProductCountsV2()
  }

  /**
   * NEW: Get supermarket products from new global product structure (products + product_offers)
   * This is the source for /dagligvarer i fremtiden.
   */
  async getSupermarketProductsV2(
    page: number = 1,
    limit: number = 100,
    categories?: string[],
    offersOnly?: boolean,
    search?: string,
    stores?: string[],
    foodOnly?: boolean,
    organicOnly?: boolean
  ): Promise<{products: any[]; total: number; hasMore: boolean}> {
    try {
      const supabase = createSupabaseClient()
      // Safety filter for "foodOnly": remove obvious drinks/snacks even if source category is mislabeled.
      const shouldExcludeFromFoodOnly = (name?: string | null, category?: string | null, subcategory?: string | null, department?: string | null) => {
        if (!foodOnly) return false
        const text = `${name || ''} ${category || ''} ${subcategory || ''} ${department || ''}`.toLowerCase()
        const excludedPatterns = [
          /\bchips?\b/,
          /\bsnacks?\b/,
          /\bslik\b/,
          /\bsodavand\b/,
          /\bjuice\b/,
          /\benergidrik\b/,
          /\bøl\b/,
          /\bvin\b/,
          /\bcider\b/,
          /\bcocio\b/,
          /\bice latte\b/,
        ]
        return excludedPatterns.some((pattern) => pattern.test(text))
      }

      const offset = (page - 1) * limit
      const categoryFilter = this.buildCategoryFilterList(categories, foodOnly)

      // Kun fødevarer + ugyldig kategori (fx kun Drikkevarer): ingen resultater
      if (foodOnly && this.hasUserCategorySelection(categories) && categoryFilter.length === 0) {
        return { products: [], total: 0, hasMore: false }
      }

      const implicitFoodOnly = Boolean(foodOnly && !this.hasUserCategorySelection(categories))

      // Category filtering using the new product_offers structure

      // Base query: offers + join til products
      let query = supabase
        .from('product_offers')
        .select(
          `
          id,
          product_id,
          store_id,
          store_product_id,
          name_store,
          product_url,
          current_price,
          normal_price,
          currency,
          is_on_sale,
          is_offer_active,
          discount_percentage,
          price_per_unit,
          price_per_kilogram,
          is_available,
          sale_valid_from,
          sale_valid_to,
          products:product_id!inner (
            id,
            name_generic,
            brand,
            category,
            subcategory,
            department,
            unit,
            amount,
            image_url
          )
        `,
          { count: 'exact' }
        )
        .eq('is_available', true)

      if (stores && stores.length > 0) {
        query = query.in('store_id', this.mapStoreFilterToIds(stores))
      }

      // IMPORTANT: Do not pre-filter by DB sale flags here.
      // We compute real offers later from (price drop OR sale flags) + valid date,
      // because DB flags can be stale/inconsistent across sources.

      // Filter by organic - find product IDs with organic labels first
      let organicProductIds: string[] | undefined
      if (organicOnly) {
        const { data: organicProducts, error: organicError } = await supabase
          .from('products')
          .select('id')
          .contains('labels', ['Økologi'])
          .limit(10000) // Should be enough for all organic products
        
        if (organicError) {
          console.error('Error fetching organic products:', organicError)
        } else if (organicProducts) {
          organicProductIds = organicProducts.map((p: any) => String(p.id))
        }
        
        // If no organic products found, return empty result
        if (!organicProductIds || organicProductIds.length === 0) {
          return { products: [], total: 0, hasMore: false }
        }
      }

      if (categoryFilter.length === 0 && implicitFoodOnly) {
        const allow = this.getFoodOnlyDepartmentAllowList()
        query = query.in('products.department', allow)
      }

      if (categoryFilter.length > 0) {
        // Efficient approach: Query products table first to get matching IDs
        // Then filter product_offers by those IDs
        // This is more reliable than trying to filter on joined tables
        let productIds: string[] = []
        
        try {
          productIds = await this.findProductIdsForCategories(categoryFilter)
          
          if (!productIds || productIds.length === 0) {
            console.error(`[CATEGORY FILTER] No product IDs found for categories: ${categoryFilter.join(', ')}`)
            return { products: [], total: 0, hasMore: false }
          }
          
          if (search && search.trim()) {
            const term = search.trim()
            const nameQuery = supabase
              .from('product_offers')
              .select('product_id')
              .or(`name_store.ilike.%${term}%`)
              .limit(1000)

            let categoryQuery = supabase
              .from('products')
              .select('id')
              .or(`department.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%,name_generic.ilike.%${term}%,brand.ilike.%${term}%`)
              .limit(1000)

            if (organicOnly) {
              categoryQuery = categoryQuery.contains('labels', ['Økologi'])
            }

            const { data: nameMatches, error: nameErr } = await nameQuery
            const { data: categoryMatches, error: catSearchErr } = await categoryQuery

            const matchingProductIds = new Set<string>()

            if (!nameErr && nameMatches) {
              nameMatches.forEach((m: any) => m?.product_id && matchingProductIds.add(String(m.product_id)))
            }

            if (!catSearchErr && categoryMatches) {
              categoryMatches.forEach((m: any) => m?.id && matchingProductIds.add(String(m.id)))
            }

            if (matchingProductIds.size > 0) {
              productIds = productIds.filter(id => matchingProductIds.has(String(id)))
            } else {
              return { products: [], total: 0, hasMore: false }
            }
          }

          // If organic filter is active, intersect with organic product IDs
          if (organicProductIds) {
            const productIdsSet = new Set(productIds)
            productIds = organicProductIds.filter(id => productIdsSet.has(id))
            if (productIds.length === 0) {
              console.warn(`[CATEGORY FILTER] No products after organic filter intersection`)
              return { products: [], total: 0, hasMore: false }
            }
          }
        } catch (error) {
          console.error(`[CATEGORY FILTER] Error finding product IDs:`, error)
          // Log full error details for Vercel debugging
          if (error instanceof Error) {
            console.error(`[CATEGORY FILTER] Error message: ${error.message}`)
            console.error(`[CATEGORY FILTER] Error stack: ${error.stack}`)
          }
          return { products: [], total: 0, hasMore: false }
        }
        
        // Use the product IDs to filter offers
        // Supabase has limits on IN clause size (typically 100 items max)
        // We need to chunk the product IDs and fetch offers separately, then combine
        const CHUNK_SIZE = 100 // Increased from 50 to reduce number of queries (Supabase supports up to 100)
        const chunks: string[][] = []
        
        for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
          chunks.push(productIds.slice(i, i + CHUNK_SIZE))
        }
        
        // Fetch all matching offers metadata from chunks (with current filters applied)
        // so we can sort globally BEFORE pagination.
        const allMatchingOffers = new Map<string, {
          id: string
          is_on_sale: boolean
          is_offer_active: boolean
          discount_percentage: number | null
          current_price: number | null
          normal_price: number | null
          sale_valid_to: string | null
        }>()
        let chunkErrors = 0
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          
          try {
            // Build query for this chunk with all filters
            let chunkQuery = supabase
              .from('product_offers')
              .select('id, is_on_sale, is_offer_active, discount_percentage, current_price, normal_price, sale_valid_to')
              .eq('is_available', true)
              .in('product_id', chunk)
            
            if (stores && stores.length > 0) {
              chunkQuery = chunkQuery.in('store_id', this.mapStoreFilterToIds(stores))
            }
            
            // IMPORTANT: do not pre-filter on sale flags here; evaluate real offer in-app.
            
            // Organic filter already applied via productIds intersection above
            
            const { data: chunkOffers, error: chunkError } = await chunkQuery
            
            if (chunkError) {
              chunkErrors++
              console.error(`[CATEGORY FILTER] Error fetching chunk ${i + 1}/${chunks.length}:`, chunkError)
              // Log full error details for Vercel
              if (chunkError.message) {
                console.error(`[CATEGORY FILTER] Error message: ${chunkError.message}`)
              }
              if (chunkError.code) {
                console.error(`[CATEGORY FILTER] Error code: ${chunkError.code}`)
              }
              continue
            }
            
            if (chunkOffers && chunkOffers.length > 0) {
              chunkOffers.forEach((offer: any) => {
                if (!offer?.id) return
                allMatchingOffers.set(String(offer.id), {
                  id: String(offer.id),
                  is_on_sale: !!offer.is_on_sale,
                  is_offer_active: !!offer.is_offer_active,
                  discount_percentage: offer.discount_percentage ?? null,
                  current_price: offer.current_price ?? null,
                  normal_price: offer.normal_price ?? null,
                  sale_valid_to: offer.sale_valid_to ?? null,
                })
              })
            }
          } catch (error) {
            chunkErrors++
            console.error(`[CATEGORY FILTER] Exception in chunk ${i + 1}/${chunks.length}:`, error)
            if (error instanceof Error) {
              console.error(`[CATEGORY FILTER] Exception message: ${error.message}`)
              console.error(`[CATEGORY FILTER] Exception stack: ${error.stack}`)
            }
          }
        }
        
        if (chunkErrors > 0) {
          console.warn(`[CATEGORY FILTER] ${chunkErrors} out of ${chunks.length} chunks had errors`)
        }
        
        const isRealOffer = (offer: {
          is_on_sale: boolean
          is_offer_active: boolean
          discount_percentage: number | null
          current_price: number | null
          normal_price: number | null
          sale_valid_to: string | null
        }) => {
          const price = Number(offer.current_price || 0)
          const normalPrice = Number(offer.normal_price || 0)
          const isOnSaleByPrice = normalPrice > price && normalPrice > 0
          const isOfferDateValid = !offer.sale_valid_to || new Date(offer.sale_valid_to) >= new Date()
          return isOfferDateValid && (offer.is_on_sale || offer.is_offer_active || isOnSaleByPrice)
        }

        let matchingOffersArray = Array.from(allMatchingOffers.values())
        if (offersOnly) {
          matchingOffersArray = matchingOffersArray.filter(isRealOffer)
        }

        // Global offer-first + discount + price sort before pagination
        matchingOffersArray.sort((a, b) => {
          const aOffer = isRealOffer(a)
          const bOffer = isRealOffer(b)
          if (aOffer && !bOffer) return -1
          if (!aOffer && bOffer) return 1

          const aDiscount = Number(a.discount_percentage || 0)
          const bDiscount = Number(b.discount_percentage || 0)
          if (bDiscount !== aDiscount) return bDiscount - aDiscount

          return Number(a.current_price || 0) - Number(b.current_price || 0)
        })

        if (matchingOffersArray.length === 0) {
          return { products: [], total: 0, hasMore: false }
        }
        
        // Now we need to fetch the full offer data for the current page
        // Since we have globally sorted offer IDs, we can paginate in memory.
        const pageStart = offset
        const pageEnd = Math.min(offset + limit, matchingOffersArray.length)
        const pageOfferIds = matchingOffersArray.slice(pageStart, pageEnd).map((o) => o.id)
        
        if (pageOfferIds.length === 0) {
          return { 
            products: [], 
            total: matchingOffersArray.length, 
            hasMore: pageEnd < matchingOffersArray.length 
          }
        }
        
        // Fetch full data for this page's offer IDs
        // Chunk the offer IDs if needed (shouldn't be more than limit, but be safe)
        const OFFER_CHUNK_SIZE = 100
        const allPageData: any[] = []
        
        for (let i = 0; i < pageOfferIds.length; i += OFFER_CHUNK_SIZE) {
          const offerChunk = pageOfferIds.slice(i, i + OFFER_CHUNK_SIZE)
          
          try {
            const chunkQuery = supabase
              .from('product_offers')
              .select(
                `
                id,
                product_id,
                store_id,
                store_product_id,
                name_store,
                product_url,
                current_price,
                normal_price,
                currency,
                is_on_sale,
                is_offer_active,
                discount_percentage,
                price_per_unit,
                price_per_kilogram,
                is_available,
                sale_valid_from,
                sale_valid_to,
                products:product_id!inner (
                  id,
                  name_generic,
                  brand,
                  category,
                  subcategory,
                  department,
                  unit,
                  amount,
                  image_url
                )
              `,
                { count: i === 0 ? 'exact' : undefined }
              )
              .in('id', offerChunk)
              .eq('is_available', true)
            
            if (stores && stores.length > 0) {
              chunkQuery.in('store_id', this.mapStoreFilterToIds(stores))
            }
            
            // IMPORTANT: do not pre-filter on sale flags here; evaluate real offer in-app.
            
            // Organic filter already applied via productIds intersection above
            
            const { data: chunkData, error: chunkError } = await chunkQuery
            
            if (chunkError) {
              console.error(`[CATEGORY FILTER] Error fetching offer data chunk ${i / OFFER_CHUNK_SIZE + 1}:`, chunkError)
              // Log full error details for Vercel
              if (chunkError.message) {
                console.error(`[CATEGORY FILTER] Error message: ${chunkError.message}`)
              }
              if (chunkError.code) {
                console.error(`[CATEGORY FILTER] Error code: ${chunkError.code}`)
              }
              if (chunkError.details) {
                console.error(`[CATEGORY FILTER] Error details: ${chunkError.details}`)
              }
              continue
            }
            
            if (chunkData && chunkData.length > 0) {
              allPageData.push(...chunkData)
            }
          } catch (error) {
            console.error(`[CATEGORY FILTER] Exception fetching offer data chunk ${i / OFFER_CHUNK_SIZE + 1}:`, error)
            if (error instanceof Error) {
              console.error(`[CATEGORY FILTER] Exception message: ${error.message}`)
              console.error(`[CATEGORY FILTER] Exception stack: ${error.stack}`)
            }
          }
        }
        
        // Map the data first to determine which are actually on sale
        const mapped = allPageData.map((row: any) => {
          const p = row.products || {}
          const price = row.current_price || 0
          const originalPrice = row.normal_price || row.current_price || 0
          const isOnSaleByFlag = !!row.is_on_sale
          const isOnSaleByPrice = originalPrice > price && originalPrice > 0
          const isOfferDateValid = !row.sale_valid_to || new Date(row.sale_valid_to) >= new Date()
          // Real offer state must be date-valid AND either sale-flag OR price-discount.
          // Do not blindly trust stale is_offer_active flags.
          const isOfferActive = isOfferDateValid && (isOnSaleByFlag || isOnSaleByPrice)
          const priceDiff = originalPrice - price
          const discountPct =
            isOnSaleByPrice && priceDiff > 0.01
              ? Math.round((priceDiff / originalPrice) * 100)
              : null

          return {
            id: row.id,
            name: row.name_store || p.name_generic,
            description: null,
            category: p.category || p.department || null,
            price,
            original_price: originalPrice,
            unit: p.unit || 'stk',
            unit_price: row.price_per_unit || row.price_per_kilogram || null,
            is_on_sale: isOfferActive,
            is_offer_active: isOfferActive,
            sale_end_date: row.sale_valid_to || null,
            discount_percentage: discountPct,
            image_url: p.image_url || this.getProductPlaceholderImage(),
            store: this.mapStoreIdToDisplayName(row.store_id),
            amount: p.amount ? String(p.amount) : null,
          }
        })
        
        const finalMapped = (offersOnly ? mapped.filter((p) => p.is_on_sale) : mapped)
          .filter((p) => !shouldExcludeFromFoodOnly(p.name, p.category, (p as { subcategory?: string }).subcategory, (p as { department?: string }).department))

        // Sort the results
        finalMapped.sort((a, b) => {
          // Offers first
          if (a.is_on_sale && !b.is_on_sale) return -1
          if (!a.is_on_sale && b.is_on_sale) return 1
          // Then by discount
          if (a.is_on_sale && b.is_on_sale) {
            const aDiscount = a.discount_percentage || 0
            const bDiscount = b.discount_percentage || 0
            if (bDiscount !== aDiscount) return bDiscount - aDiscount
          }
          // Then by price
          return (a.price || 0) - (b.price || 0)
        })
        
        return { 
          products: finalMapped, 
          total: matchingOffersArray.length, 
          hasMore: pageEnd < matchingOffersArray.length 
        }
      }

      if (search && search.trim()) {
        // Forbedret tekstsøgning i butiksnavn + globalt navn + brand + kategori-felter
        const term = search.trim()
        
        // Find products matching the search term in name/brand fields
        const nameQuery = supabase
          .from('product_offers')
          .select('product_id')
          .or(`name_store.ilike.%${term}%`)
          .limit(1000)
        
        // Also find products matching in category fields
        let categoryQuery = supabase
          .from('products')
          .select('id')
          .or(`department.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%,name_generic.ilike.%${term}%,brand.ilike.%${term}%`)
          .limit(1000)
        
        // Apply organic filter to product search if needed
        if (organicOnly) {
          categoryQuery = categoryQuery.contains('labels', ['Økologi'])
        }
        
        const { data: nameMatches, error: nameErr } = await nameQuery
        const { data: categoryMatches, error: catSearchErr } = await categoryQuery
        
        const matchingProductIds = new Set<string>()
        
        if (!nameErr && nameMatches) {
          nameMatches.forEach((m: any) => m?.product_id && matchingProductIds.add(m.product_id))
        }
        
        if (!catSearchErr && categoryMatches) {
          categoryMatches.forEach((m: any) => m?.id && matchingProductIds.add(m.id))
        }
        
        let finalProductIds = Array.from(matchingProductIds)
        
        // If organic filter is active, intersect with organic product IDs
        if (organicProductIds) {
          const matchingSet = new Set(finalProductIds)
          finalProductIds = organicProductIds.filter(id => matchingSet.has(id))
        }
        
        if (finalProductIds.length > 0) {
          query = query.in('product_id', finalProductIds)
        } else {
          // No matches found, return empty result
          return { products: [], total: 0, hasMore: false }
        }
      } else if (organicProductIds) {
        // No search, but organic filter is active - filter by organic product IDs
        query = query.in('product_id', organicProductIds)
      }

      // NOTE: When offersOnly=true, we fetch all products and filter in application layer
      // This ensures we catch products that are actually on sale (normal_price > current_price)
      // even if the is_on_sale flag is incorrectly set to false
      
      query = query
        .order('is_offer_active', { ascending: false }) // tilbud først
        .order('discount_percentage', { ascending: false, nullsFirst: false })
        .order('current_price', { ascending: true })
        .range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching supermarket products (V2):', error)
        return { products: [], total: 0, hasMore: false }
      }

        // Map the data first to determine which are actually on sale
      const mapped = (data || []).map((row: any) => {
        const p = row.products || {}
        
        // Debug: Log if products object is missing
        if (!row.products && categoryFilter.length > 0) {
          console.warn(`⚠️ Missing products object for offer ${row.id}, product_id: ${row.product_id}`)
        }

        const price = row.current_price || 0
        const originalPrice = row.normal_price || row.current_price || 0
        const isOnSaleByFlag = !!row.is_on_sale
        const isOnSaleByPrice = originalPrice > price && originalPrice > 0
        const isOfferDateValid = !row.sale_valid_to || new Date(row.sale_valid_to) >= new Date()
        // Real offer state must be date-valid AND either sale-flag OR price-discount.
        // Do not blindly trust stale is_offer_active flags.
        const isOfferActive = isOfferDateValid && (isOnSaleByFlag || isOnSaleByPrice)
        const priceDiff = originalPrice - price
        const discountPct =
          isOnSaleByPrice && priceDiff > 0.01
            ? Math.round((priceDiff / originalPrice) * 100)
            : null

        return {
          // id bruges af /dagligvarer
          id: row.id,
          name: row.name_store || p.name_generic,
          description: null,
          category: p.category || p.department || null,
          price,
          original_price: originalPrice,
          unit: p.unit || 'stk',
          unit_price: row.price_per_unit || row.price_per_kilogram || null,
          is_on_sale: isOfferActive,
          is_offer_active: isOfferActive,
          sale_end_date: row.sale_valid_to || null,
          discount_percentage: discountPct,
          image_url: p.image_url || this.getProductPlaceholderImage(),
          store: this.mapStoreIdToDisplayName(row.store_id),
          amount: p.amount ? String(p.amount) : null,
          }
        })
        
      const finalMapped = (offersOnly ? mapped.filter((p) => p.is_on_sale) : mapped)
        .filter((p) => !shouldExcludeFromFoodOnly(p.name, p.category, (p as { subcategory?: string }).subcategory, (p as { department?: string }).department))

      // Sort the results
      finalMapped.sort((a, b) => {
        // Offers first
        if (a.is_on_sale && !b.is_on_sale) return -1
        if (!a.is_on_sale && b.is_on_sale) return 1
        // Then by discount
        if (a.is_on_sale && b.is_on_sale) {
          const aDiscount = a.discount_percentage || 0
          const bDiscount = b.discount_percentage || 0
          if (bDiscount !== aDiscount) return bDiscount - aDiscount
        }
        // Then by price
        return (a.price || 0) - (b.price || 0)
      })
      
      const total = count || 0
      const hasMore = offset + limit < total
      
      return { products: finalMapped, total, hasMore }
    } catch (error) {
      console.error('Error in getSupermarketProductsV2:', error)
      return { products: [], total: 0, hasMore: false }
    }
  }

  /**
   * Helper: find product_ids whose department/category matches any of the provided categories.
   * Uses iterative ilike to avoid brittle OR strings and supports URL-decoded variants.
   */
  /** Synonymer pr. kanonisk kategori — matcher fx REMA "Kød & fisk" mod UI "Kød og fisk". */
  private getDepartmentAliasesForCanonicalCategory(canonical: string): string[] {
    const map: Record<string, string[]> = {
      'Kød og fisk': ['Kød & fisk', 'Kød, fisk & fjerkræ', 'Kød fisk'],
      'Mejeri og køl': ['Køl', 'Mejeri', 'Ost m.v.'],
      'Brød og kager': ['Brød', 'Kager'],
      'Frugt og grønt': ['Frugt & grønt'],
    }
    return map[canonical] || []
  }

  private getFoodOnlyDepartmentAllowList(): string[] {
    return Array.from(new Set([...this.FOOD_ONLY_CATEGORIES, ...this.FOOD_ONLY_DEPARTMENT_EXTRA]))
  }

  private hasUserCategorySelection(categories?: string[]): boolean {
    const normalized = (categories || [])
      .map((cat) => this.normalizeCategoryInput(cat))
      .filter((cat): cat is string => Boolean(cat))
    return normalized.length > 0
  }

  private async findProductIdsForCategories(categories: string[]): Promise<string[]> {
    const supabase = createSupabaseClient()
    const seen = new Set<string>()

    const expandedVariants = (cat: string): string[] => {
      const variants = new Set<string>()
      const raw = cat || ''
      const decoded = (() => { try { return decodeURIComponent(raw) } catch { return raw } })()
      const normalized = decoded.trim().replace(/\s+/g, ' ')
      
      // Try exact match first (case-insensitive)
      variants.add(normalized)
      variants.add(normalized.toLowerCase())
      variants.add(normalized.toUpperCase())
      
      // Replace & with og and vice versa
      variants.add(normalized.replace(/&/g, ' og ').replace(/\s+/g, ' ').trim())
      variants.add(normalized.replace(/\s+og\s+/g, ' & ').replace(/\s+/g, ' ').trim())
      variants.add(normalized.replace(/&/g, 'og'))
      variants.add(normalized.replace(/\s+og\s+/g, '&'))
      
      // Replace commas with space
      variants.add(normalized.replace(/,/g, ' '))
      
      // Remove common suffixes
      variants.add(normalized.replace(/\s+og\s+grøntsager?$/i, ''))
      variants.add(normalized.replace(/\s+grøntsager?$/i, ''))
      
      return Array.from(variants).filter(Boolean)
    }

    // OPTIMIZED: Try exact matches first (much faster), then fall back to partial matches
    for (const cat of categories) {
      const normalized = cat.trim()
      const aliasesToTry = Array.from(
        new Set([normalized, ...this.getDepartmentAliasesForCanonicalCategory(normalized)])
      )

      let matchedThisCategory = false
      for (const alias of aliasesToTry) {
        const { data: exactDept, error: deptErr } = await supabase
          .from('products')
          .select('id')
          .ilike('department', alias)
          .limit(10000)

        if (!deptErr && exactDept && exactDept.length > 0) {
          exactDept.forEach((r) => r?.id && seen.add(r.id))
          matchedThisCategory = true
          break
        }

        const { data: exactCat, error: catErr } = await supabase
          .from('products')
          .select('id')
          .ilike('category', alias)
          .limit(10000)

        if (!catErr && exactCat && exactCat.length > 0) {
          exactCat.forEach((r) => r?.id && seen.add(r.id))
          matchedThisCategory = true
          break
        }
      }

      if (matchedThisCategory) {
        continue
      }

      // STEP 3: If no exact match, try variants with OR query (faster than multiple separate queries)
      const variants = expandedVariants(cat)
      const keyVariants = Array.from(new Set(variants)).filter(Boolean)

      if (keyVariants.length > 0) {
        // Use OR query to search all fields at once (much faster than separate queries)
        const orConditions = keyVariants.map(v => 
          `department.ilike.%${v}%,category.ilike.%${v}%,subcategory.ilike.%${v}%`
        ).join(',')
        
        const { data: variantRows, error: variantErr } = await supabase
          .from('products')
          .select('id')
          .or(orConditions)
          .limit(10000)
        
        if (!variantErr && variantRows) {
          variantRows.forEach(r => r?.id && seen.add(r.id))
        }
      }
    }

    if (seen.size === 0) {
      console.warn(`[CATEGORY FILTER] No products found for categories: ${categories.join(', ')}`)
    }
    return Array.from(seen)
  }

  /**
   * Simple mapping fra store_id i DB til visningsnavn
   */
  private mapStoreIdToDisplayName(storeId: string | null): string {
    if (!storeId) return 'Ukendt butik'
    const id = storeId.toLowerCase()
    switch (id) {
      case 'netto':
        return 'Netto'
      case 'rema-1000':
      case 'rema':
        return 'REMA 1000'
      case '365-discount':
        return '365 Discount'
      case 'lidl':
        return 'Lidl'
      case 'bilka':
        return 'Bilka'
      case 'nemlig':
        return 'Nemlig'
      case 'menu':
      case 'meny':
        return 'MENY'
      case 'spar':
        return 'Spar'
      case 'kvickly':
        return 'Kvickly'
      case 'super-brugsen':
        return 'Super Brugsen'
      case 'brugsen':
        return 'Brugsen'
      case 'løvbjerg':
        return 'Løvbjerg'
      case 'abc-lavpris':
        return 'ABC Lavpris'
      default:
        return storeId
    }
  }

  /**
   * Map store-navne fra frontend-filtre til store_id-slugs i databasen
   */
  private mapStoreFilterToIds(stores: string[]): string[] {
    const mapping: Record<string, string> = {
      'Netto': 'netto',
      'REMA 1000': 'rema-1000',
      '365discount': '365discount',
      '365 Discount': '365discount',
      'Lidl': 'lidl',
      'Føtex': 'fotex',
      'Foetex': 'fotex',
      'Bilka': 'bilka',
      'Nemlig': 'nemlig',
      'MENY': 'meny',
      'MENU': 'meny',
      'Spar': 'spar',
      'Kvickly': 'kvickly',
      'superbrugsen': 'superbrugsen',
      'Super Brugsen': 'superbrugsen',
      'Brugsen': 'brugsen',
      'Løvbjerg': 'lovbjerg',
      'ABC Lavpris': 'abc-lavpris',
    }

    return stores.map((s) => mapping[s] || s.toLowerCase().replace(/\s+/g, '-'))
  }

  private buildCategoryFilterList(categories?: string[], foodOnly?: boolean): string[] {
    const normalized = (categories || [])
      .map(cat => this.normalizeCategoryInput(cat))
      .filter((cat): cat is string => Boolean(cat))

    const unique = Array.from(new Set(normalized))

    if (foodOnly) {
      const allowed = this.getFoodOnlyCategories()
      const allowedSet = new Set(allowed)
      if (unique.length === 0) {
        // Tom = "alle fødevarer": ikke brug findProductIdsForCategories (undermatcher butiksnavne som REMA)
        return []
      }
      return unique.filter(cat => allowedSet.has(cat))
    }

    return unique
  }

  private normalizeCategoryInput(category?: string | null): string | null {
    if (!category) return null
    const trimmed = category.trim()
    if (!trimmed) return null
    const key = trimmed.toLowerCase()
    return this.CATEGORY_NORMALIZATION_MAP[key] || trimmed
  }

  private getFoodOnlyCategories(): string[] {
    return [...this.FOOD_ONLY_CATEGORIES]
  }

  private getProductPlaceholderImage(): string {
    return '/images/recipe-placeholder.jpg'
  }


  /**
   * Get ALL supermarket products for delta updates (with pagination to handle Supabase 1000 row limit)
   */
  async getAllSupermarketProductsForDelta(): Promise<{products: any[], total: number}> {
    try {
      const supabase = createSupabaseClient()
      const allProducts: any[] = []
      let offset = 0
      const limit = 1000 // Supabase max per query
      let hasMore = true
      
      console.log(`🔄 Delta service: Starting paginated fetch of ALL products...`)
      
      // Fetch all products in batches of 1000
      while (hasMore) {
        const { data, error } = await supabase
          .from('supermarket_products')
          .select('*', { count: 'exact' })
          // Process oldest-updated products first so likely-changed items are checked earlier
          .order('updated_at', { ascending: true })
          .range(offset, offset + limit - 1)
        
        if (error) {
          console.error(`Error fetching supermarket products batch (offset ${offset}):`, error)
          break
        }
        
        if (!data || data.length === 0) {
          hasMore = false
          break
        }
        
        // Process products with discount logic
        const processedProducts = data.map(product => {
          const price = product.price || 0
          const originalPrice = product.original_price || 0
          const isMarkedOnSale = product.is_on_sale || false
          
          const hasValidPrices = price > 0 && originalPrice > 0
          const priceDifference = originalPrice - price
          const isActualDiscount = priceDifference > 0.01
          
          // Show offers even if original_price === price (for now)
          const isRealOffer = isMarkedOnSale && hasValidPrices
          
          let discountPercentage = 0
          if (isRealOffer && originalPrice > 0 && isActualDiscount) {
            discountPercentage = Math.round((priceDifference / originalPrice) * 100)
          }
          
          return {
            ...product,
            is_on_sale: isRealOffer,
            discount_percentage: isRealOffer ? (isActualDiscount ? discountPercentage : 0) : null,
            _original_is_on_sale: isMarkedOnSale, // Keep original flag for debugging
            _has_valid_prices: hasValidPrices,
            _price_difference: priceDifference,
            _is_actual_discount: isActualDiscount
          }
        })
        
        allProducts.push(...processedProducts)
        offset += limit
        
        console.log(`📊 Delta service: Fetched batch ${Math.floor(offset / limit)}: ${data.length} products (total so far: ${allProducts.length})`)
        
        // Check if we've reached the end
        if (data.length < limit) {
          hasMore = false
        }
      }
      
      console.log(`🔍 Delta service: Completed! Found ${allProducts.length} total products in database`)
      
      return { 
        products: allProducts, 
        total: allProducts.length
      }
    } catch (error) {
      console.error('Error in getAllSupermarketProductsForDelta:', error)
      return { products: [], total: 0 }
    }
  }

  /**
   * Get all supermarket products from the database with pagination
   * TEMPORARY: Fetch more products to find offers, then sort and paginate
   */
  async getSupermarketProducts(page: number = 1, limit: number = 100, categories?: string[], offersOnly?: boolean, search?: string, stores?: string[]): Promise<{products: any[], total: number, hasMore: boolean}> {
    try {
      // If only offers requested, use simple query
      if (offersOnly) {
        return this.getProductsWithSimpleQuery(page, limit, categories, true, search, stores)
      }
      
      // For search queries, use simple query directly to avoid complex sorting
      if (search && search.trim()) {
        return this.getProductsWithSimpleQuery(page, limit, categories, false, search, stores)
      }
      
      // For regular browsing, use expanded limit for better offer sorting
      const expandedLimit = Math.min(2000, limit * 20)
      const { products: allProducts, total } = await this.getProductsWithSimpleQuery(1, expandedLimit, categories, false, search, stores)
      
      // Sort processed products so offers come first
      allProducts.sort((a, b) => {
        // 🔥 Real offers first (including those with original_price === price)
        if (a.is_on_sale && !b.is_on_sale) return -1
        if (!a.is_on_sale && b.is_on_sale) return 1
        // Then by name
        return a.name.localeCompare(b.name)
      })
      
      // Apply pagination to sorted results
      const offset = (page - 1) * limit
      const paginatedProducts = allProducts.slice(offset, offset + limit)
      const hasMore = offset + limit < allProducts.length
      
      console.log(`🔍 Database service: Found ${paginatedProducts?.length || 0} products (page ${page}, total: ${total})`)
      console.log(`🔥 TEMP Strategy: Fetched ${allProducts.length} products, sorted offers first`)
      
      const realOffers = paginatedProducts.filter(p => p.is_on_sale).length
      const markedAsOffers = paginatedProducts.filter(p => p._original_is_on_sale).length
      console.log(`💰 Discount processing: ${markedAsOffers} marked as offers, ${realOffers} real offers`)
      
      return { 
        products: paginatedProducts, 
        total, 
        hasMore 
      }
    } catch (error) {
      console.error('Error in getSupermarketProducts:', error)
      return { products: [], total: 0, hasMore: false }
    }
  }

  /**
   * Simple query method for backward compatibility and offers-only requests
   */
  private async getProductsWithSimpleQuery(page: number = 1, limit: number = 100, categories?: string[], offersOnly?: boolean, search?: string, stores?: string[]): Promise<{products: any[], total: number, hasMore: boolean}> {
    const supabase = createSupabaseClient()
    
    let query = supabase
      .from('supermarket_products')
      .select('*', { count: 'exact' })
      .eq('available', true) // Only show available products (hide discontinued)
    
    // For search queries, don't order by name to get better results
    // For regular queries, order alphabetically
    if (!search || !search.trim()) {
      query = query.order('name', { ascending: true })
    }
    
    if (categories && categories.length > 0) {
      query = query.in('category', categories)
    }
    if (stores && stores.length > 0) {
      query = query.in('store', stores)
    }
    if (offersOnly) {
      query = query.eq('is_on_sale', true)
    }
    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`)
    }
    
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error fetching supermarket products:', error)
      return { products: [], total: 0, hasMore: false }
    }

    // Post-process search results to filter out irrelevant matches
    let filteredData = data || []
    if (search && search.trim().toLowerCase() === 'æg') {
      // For "æg" search, only include products that are actually egg-related
      // Include: SKRABEÆG, FRILANDSÆG, SLOTSÆG, ØKOLOGISKE ÆG, ÆGGESALAT, etc.
      // Exclude: KØDKVÆG, JÆGERPØLSE, MELLEMLÆGSPAPIR, LETVÆGTSKATTEGRUS, etc.
      const includeRegex = /(æg|ægge|æggeblommer|æggehvider|æggesalat|æggestand|skrabeæg|frilandsæg|slotsæg|økologiske æg|helæg|brunchæg)/i
      const excludeRegex = /(kød|pølse|køb|jæger|ungkvæg|trusseindlæg|pålæg|mellemlægspapir|letvægtskattegrus|ammeindlæg|ægte mayonnaise)/i
      
      filteredData = filteredData.filter(product => 
        includeRegex.test(product.name) && !excludeRegex.test(product.name)
      )
      
      // Sort to prioritize complete word matches first
      filteredData.sort((a, b) => {
        const aHasCompleteWord = /(^|[^a-zæøå])æg([^a-zæøå]|$)/i.test(a.name)
        const bHasCompleteWord = /(^|[^a-zæøå])æg([^a-zæøå]|$)/i.test(b.name)
        
        if (aHasCompleteWord && !bHasCompleteWord) return -1
        if (!aHasCompleteWord && bHasCompleteWord) return 1
        return 0
      })
    }

          // Process products with discount logic
      const processedProducts = (filteredData || []).map(product => {
        const price = product.price || 0
        const originalPrice = product.original_price || 0
        const isMarkedOnSale = product.is_on_sale || false
        
        const hasValidPrices = price > 0 && originalPrice > 0
        const priceDifference = originalPrice - price
        const isActualDiscount = priceDifference > 0.01
        
        // 🔥 CORRECT LOGIC: Only show real offers where original_price > price
        // Products without actual discount should not appear in offers section
        const isRealOffer = isMarkedOnSale && hasValidPrices && isActualDiscount
        
        let discountPercentage = 0
        if (isRealOffer && originalPrice > 0 && isActualDiscount) {
          discountPercentage = Math.round((priceDifference / originalPrice) * 100)
        }
        
        return {
          ...product,
          is_on_sale: isRealOffer,
          discount_percentage: isRealOffer ? (isActualDiscount ? discountPercentage : 0) : null,
          _original_is_on_sale: isMarkedOnSale,
          _price_difference: priceDifference
        }
      })

    const total = count || 0
    const hasMore = offset + limit < total
    
    return { 
      products: processedProducts, 
      total, 
      hasMore 
    }
  }

  /**
   * Get products by category with pagination (for Goma-style display)
   */
  async getProductsByCategory(category: string, limit: number = 20): Promise<{products: SupermarketProduct[], total: number, hasMore: boolean}> {
    try {
      const supabase = createSupabaseClient()
      
      const { data, error, count } = await supabase
        .from('supermarket_products')
        .select('*', { count: 'exact' })
        .eq('category', category)
        .order('name', { ascending: true })
        .limit(limit)
      
      if (error) {
        console.error(`Error fetching products for category ${category}:`, error)
        return { products: [], total: 0, hasMore: false }
      }

      const total = count || 0
      const hasMore = total > limit
      
      console.log(`🔍 Database service: Found ${data?.length || 0} products for category ${category} (total: ${total})`)
      return { 
        products: data || [], 
        total, 
        hasMore 
      }
    } catch (error) {
      console.error(`Error in getProductsByCategory for ${category}:`, error)
      return { products: [], total: 0, hasMore: false }
    }
  }

  /**
   * Update an existing supermarket product
   */
  async updateSupermarketProduct(product: SupermarketProduct): Promise<boolean> {
    try {
      // Convert camelCase interface to snake_case database fields
      const updateData: any = {
        name: product.name,
        description: product.description,
        category: product.category,
        subcategory: product.subcategory,
        price: product.price,
        original_price: product.originalPrice,
        unit: product.unit,
        unit_price: product.unitPrice,
        is_on_sale: product.isOnSale,
        sale_end_date: product.saleEndDate,
        image_url: product.imageUrl,
        available: product.available,
        temperature_zone: product.temperatureZone,
        nutrition_info: product.nutritionInfo,
        labels: product.labels,
        last_updated: product.lastUpdated
      }
      
      // Remove undefined fields to avoid database errors
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
      const supabase = createSupabaseClient()
      const externalId: string | undefined = (product as any).external_id
      const identifier = externalId || String(product.id)

      console.log(`🔧 Updating product using ${externalId ? 'external_id' : 'id'}=${identifier} with:`, updateData)
      
      let query = supabase
        .from('supermarket_products')
        .update(updateData)
      if (externalId) {
        query = query.eq('external_id', externalId)
      } else {
        query = query.eq('id', product.id)
      }
      const { error } = await query

      if (error) {
        console.error('Error updating supermarket product:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateSupermarketProduct:', error)
      return false
    }
  }

  /**
   * Add a new supermarket product
   */
  async addSupermarketProduct(product: SupermarketProduct): Promise<boolean> {
    try {
      const { error } = await createSupabaseClient()
        .from('supermarket_products')
        .insert({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          subcategory: product.subcategory,
          price: product.price,
          originalPrice: product.originalPrice,
          unit: product.unit,
          unitPrice: product.unitPrice,
          isOnSale: product.isOnSale,
          saleEndDate: product.saleEndDate,
          imageUrl: product.imageUrl,
          store: product.store,
          available: product.available,
          temperatureZone: product.temperatureZone,
          nutritionInfo: product.nutritionInfo,
          labels: product.labels,
          lastUpdated: product.lastUpdated,
          source: product.source
        })

      if (error) {
        console.error('Error adding supermarket product:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in addSupermarketProduct:', error)
      return false
    }
  }

  /**
   * Generate unique IDs for recipes that don't have one
   */
  async assignUniqueIds(recipes: Recipe[]): Promise<Recipe[]> {
    const supabase = createSupabaseClient()
    // SIMPLE: Generate IDs only for recipes without IDs, starting from 1000
    let nextId = 1000
    
    // Check existing recipes to find highest ID
    const { data: existingRecipes } = await supabase
      .from('recipes')
      .select('id')
    
    if (existingRecipes) {
      const numericIds = existingRecipes
        .map(r => parseInt(r.id))
        .filter(id => !isNaN(id) && id > 0 && id < 10000) // Only use reasonable numeric IDs (1-9999), not timestamps
      
      if (numericIds.length > 0) {
        nextId = Math.max(...numericIds) + 1
        console.log(`🔍 Found numeric IDs: [${numericIds.join(', ')}], using nextId: ${nextId}`)
      } else {
        console.log(`🔍 No valid numeric IDs found, starting from: ${nextId}`)
      }
    }
    
    return recipes.map(recipe => {
      if (!recipe.id || recipe.id === '') {
        const newId = nextId.toString()
        console.log(`🆔 Assigning ID ${newId} to recipe: ${recipe.title}`)
        nextId++
        return { ...recipe, id: newId }
      }
      return recipe
    })
  }

  /**
   * Save recipes to database (using only existing columns)
   */
  async saveRecipes(recipes: Recipe[]): Promise<boolean> {
    const supabase = createSupabaseClient()
    try {
      console.log(`💾 Attempting to save ${recipes.length} recipes...`)
      
      // Assign unique IDs to recipes that don't have one
      const recipesWithIds = await this.assignUniqueIds(recipes)
      
      // Filter recipes to only include columns that exist in the database
      const filteredRecipes = recipesWithIds.map(recipe => {
        const filteredRecipe: any = {
          id: recipe.id,
          title: recipe.title,
          slug: recipe.slug,
          description: recipe.description,
          shortDescription: recipe.shortDescription,
          preparationTime: recipe.preparationTime,
          cookingTime: recipe.cookingTime,
          totalTime: recipe.totalTime,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          fiber: recipe.fiber,
          mainCategory: recipe.mainCategory,
          subCategories: recipe.subCategories,
          dietaryCategories: recipe.dietaryCategories,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          imageUrl: recipe.imageUrl,
          imageAlt: recipe.imageAlt,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          author: recipe.author,
          publishedAt: recipe.publishedAt,
          updatedAt: recipe.updatedAt,
          metaTitle: recipe.metaTitle,
          metaDescription: recipe.metaDescription,
          keywords: recipe.keywords,
          rating: recipe.rating,
          reviewCount: recipe.reviewCount
        }
        
        // Add optional fields if they exist (only include columns we know exist)
        if (recipe.slug) filteredRecipe.slug = recipe.slug
        
        // Add default values for fields that frontend expects but don't exist in database
        filteredRecipe.shortDescription = recipe.shortDescription || null
        filteredRecipe.preparationTime = recipe.preparationTime || 0
        filteredRecipe.cookingTime = recipe.cookingTime || 0
        filteredRecipe.totalTime = recipe.totalTime || (recipe.preparationTime || 0) + (recipe.cookingTime || 0)
        filteredRecipe.metaTitle = recipe.metaTitle || null
        filteredRecipe.metaDescription = recipe.metaDescription || null
        filteredRecipe.mainCategory = recipe.mainCategory || null
        filteredRecipe.subCategories = recipe.subCategories || null
        filteredRecipe.dietaryCategories = recipe.dietaryCategories && recipe.dietaryCategories.length > 0 ? recipe.dietaryCategories : null
        filteredRecipe.imageUrl = recipe.imageUrl || '/images/recipe-placeholder.jpg'
        filteredRecipe.imageAlt = recipe.imageAlt || null
        filteredRecipe.publishedAt = recipe.publishedAt ? (typeof recipe.publishedAt === 'string' ? recipe.publishedAt : recipe.publishedAt.toISOString()) : new Date().toISOString()
        filteredRecipe.updatedAt = recipe.updatedAt ? (typeof recipe.updatedAt === 'string' ? recipe.updatedAt : recipe.updatedAt.toISOString()) : new Date().toISOString()
        filteredRecipe.rating = recipe.rating || null
        filteredRecipe.reviewCount = recipe.reviewCount || null
        
        // Note: nutritionalInfo, personalTips, status, prepTimeISO, cookTimeISO, totalTimeISO 
        // are not stored in recipes table - they are handled separately or stored in ingredients table
        
        return filteredRecipe
      })
      
      // Log the first recipe structure for debugging
      if (filteredRecipes.length > 0) {
        console.log('📋 First filtered recipe structure:', JSON.stringify(filteredRecipes[0], null, 2))
      }
      
      const { error } = await supabase
        .from('recipes')
        .insert(filteredRecipes)
      
      if (error) {
        console.error('❌ Error saving recipes:', error)
        console.error('Error details:', { 
          message: error.message, 
          details: error.details, 
          hint: error.hint, 
          code: error.code 
        })
        console.error('🔍 First recipe that failed:', JSON.stringify(filteredRecipes[0], null, 2))
        return false
      }
      
      console.log(`✅ Successfully saved ${recipes.length} recipes to database`)
      return true
    } catch (err) {
      console.error('❌ Exception saving recipes:', err)
      return false
    }
  }

  /**
   * Save ingredients to database (using only existing columns)
   */
  async saveIngredients(ingredients: IngredientTag[]): Promise<boolean> {
    const supabase = createSupabaseClient()
    try {
      console.log(`💾 Attempting to save ${ingredients.length} ingredients...`)
      
      // Filter ingredients to only include columns that exist in the database
      const filteredIngredients = ingredients.map(ingredient => {
        const filteredIngredient: any = {
          id: ingredient.id,
          name: ingredient.name,
          category: ingredient.category,
          description: ingredient.description
        }
        
        // Add optional fields if they exist (only include columns we know exist)
        if (ingredient.exclusions) filteredIngredient.exclusions = ingredient.exclusions
        if (ingredient.allergens) filteredIngredient.allergens = ingredient.allergens
        if (ingredient.nutritionalInfo) filteredIngredient.nutritionalInfo = ingredient.nutritionalInfo
        if (ingredient.commonNames) filteredIngredient.commonNames = ingredient.commonNames
        if (ingredient.isActive !== undefined) filteredIngredient.isActive = ingredient.isActive
        
        // Note: createdAt and updatedAt are handled by database defaults
        
        return filteredIngredient
      })
      
      // Log the first ingredient structure for debugging
      if (filteredIngredients.length > 0) {
        console.log('📋 First filtered ingredient structure:', JSON.stringify(filteredIngredients[0], null, 2))
      }
      
      const { error } = await supabase
        .from('ingredients')
        .upsert(filteredIngredients, { onConflict: 'id' })
      
      if (error) {
        console.error('❌ Error saving ingredients:', error)
        console.error('Error details:', { 
          message: error.message, 
          details: error.details, 
          hint: error.hint, 
          code: error.code 
        })
        return false
      }
      
      console.log(`✅ Successfully saved ${ingredients.length} ingredients to database`)
      return true
    } catch (err) {
      console.error('❌ Exception saving ingredients:', err)
      return false
    }
  }

  /**
   * Check database tables exist
   */
  async checkDatabaseStructure(): Promise<any> {
    const supabase = createSupabaseClient()
    try {
      console.log('🔍 Checking database structure...')
      
      // Test if tables exist
      const { error: recipesError } = await supabase
        .from('recipes')
        .select('count', { count: 'exact', head: true })
      
      const { error: ingredientsError } = await supabase
        .from('ingredients')
        .select('count', { count: 'exact', head: true })
      
      const structure = {
        recipesTable: {
          exists: !recipesError,
          error: recipesError?.message || null
        },
        ingredientsTable: {
          exists: !ingredientsError,
          error: ingredientsError?.message || null
        }
      }
      
      console.log('📊 Database structure check:', structure)
      return structure
    } catch (err) {
      console.error('❌ Error checking database structure:', err)
      return { error: err }
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{ recipeCount: number; ingredientCount: number }> {
    const supabase = createSupabaseClient()
    try {
      const { count: recipeCount, error: recipeError } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
      
      const { count: ingredientCount, error: ingredientError } = await supabase
        .from('ingredients')
        .select('*', { count: 'exact', head: true })
      
      if (recipeError || ingredientError) {
        console.error('Error fetching database stats:', recipeError || ingredientError)
        return { recipeCount: 0, ingredientCount: 0 }
      }
      
      return { recipeCount: recipeCount || 0, ingredientCount: ingredientCount || 0 }
    } catch (err) {
      console.error('❌ Error getting database stats:', err)
      return { recipeCount: 0, ingredientCount: 0 }
    }
  }

  /**
   * Find similar products across different stores based on name matching
   */
  async getSimilarProductsAcrossStores(productName: string, excludeStore?: string): Promise<SupermarketProduct[]> {
    try {
      const supabase = createSupabaseClient();
      
      // Normalize the product name for better matching
      const normalizedName = productName
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      
      // Build query to find similar products
      let query = supabase
        .from('supermarket_products')
        .select('*')
        .ilike('name', `%${normalizedName}%`)
        .order('store', { ascending: true })
        .order('price', { ascending: true });
      
      // Exclude the current store if specified
      if (excludeStore) {
        query = query.neq('store', excludeStore);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching similar products:', error);
        return [];
      }

      // Process products to fix discount logic (same as getSupermarketProducts)
      const processedProducts = (data || []).map(product => {
        const originalPrice = product.original_price || product.price;
        const currentPrice = product.price || 0;
        const priceDifference = originalPrice - currentPrice;
        const isRealOffer = product.is_on_sale && originalPrice > currentPrice && priceDifference > 0.01;
        
        return {
          ...product,
          is_on_sale: isRealOffer,
          discount_percentage: isRealOffer ? Math.round((priceDifference / originalPrice) * 100) : 0
        };
      });

      return processedProducts;
    } catch (error) {
      console.error('Error in getSimilarProductsAcrossStores:', error);
      return [];
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    const supabase = createSupabaseClient()
    try {
      console.log('🔍 Testing Supabase connection...')
      const { error } = await supabase.from('recipes').select('count', { count: 'exact', head: true })
      if (error) {
        console.error('❌ Connection test failed:', error)
        return false
      }
      console.log('✅ Supabase connection successful!')
      return true
    } catch (err) {
      console.error('❌ Connection test exception:', err)
      return false
    }
  }
}

export const databaseService = new DatabaseService() 