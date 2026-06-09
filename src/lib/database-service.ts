import { createSupabaseClient, createSupabaseServiceClient } from './supabase'
import { Recipe } from '@/types/recipe'
import { IngredientTag } from '@/lib/ingredient-system/types'
import { SupermarketProduct } from '@/lib/supermarket-scraper/types'
import { getFoodCatalogLabelsForFilter } from '@/lib/product-food-classification'

/** Proven discount — stol ikke på is_on_sale / is_offer_active alene (Planomo jun 2026). */
export type OfferPricingFields = {
  current_price?: number | null
  normal_price?: number | null
  sale_valid_to?: string | null
}

export function isRealOfferFields(offer: OfferPricingFields): boolean {
  const price = Number(offer.current_price || 0)
  if (price <= 0) return false
  if (offer.sale_valid_to && new Date(offer.sale_valid_to) < new Date()) return false
  const normal = offer.normal_price != null ? Number(offer.normal_price) : null
  return normal != null && normal > price + 0.01
}

export function resolveOfferDisplayPricing(
  offer: OfferPricingFields & {
    is_on_sale?: boolean
    is_offer_active?: boolean
    discount_percentage?: number | null
  },
) {
  const price = Number(offer.current_price || 0)
  const normal = offer.normal_price != null ? Number(offer.normal_price) : null
  const isReal = isRealOfferFields(offer)
  const originalPrice = isReal && normal != null ? normal : price
  const discountPct =
    isReal && normal != null && normal > price + 0.01
      ? Math.round(((normal - price) / normal) * 100)
      : null
  return {
    price,
    original_price: originalPrice,
    is_on_sale: isReal,
    is_offer_active: isReal,
    discount_percentage: discountPct,
  }
}

/**
 * Run async work over a list with bounded concurrency.
 * Used for chunked Supabase fetches so we don't fire dozens of sequential
 * roundtrips (slow) or hundreds in parallel (rate limit / connection storms).
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  const workerCount = Math.max(1, Math.min(concurrency, items.length))
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const idx = nextIndex++
      if (idx >= items.length) return
      results[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return results
}

export class DatabaseService {
  private readonly RECIPES_CACHE_TTL_MS = 60_000
  private publishedRecipesCache: { data: Recipe[]; expiresAt: number } | null = null
  private allRecipesCache: { data: Recipe[]; expiresAt: number } | null = null

  private readonly PRODUCT_COUNTS_CACHE_TTL_MS = 600_000
  private productCountsCache: {
    slot: 'food' | 'all'
    data: { total: number; categories: { [key: string]: number }; offers: number }
    expiresAt: number
  } | null = null

  /**
   * Category → product IDs is expensive (multiple ilike queries with fallbacks)
   * but the answer changes rarely. Cache aggressively in-process so repeat
   * filter clicks on the same category re-use the work.
   */
  private readonly CATEGORY_PRODUCT_IDS_TTL_MS = 5 * 60_000
  private categoryProductIdsCache = new Map<string, { data: string[]; expiresAt: number }>()

  private readonly CATEGORY_NORMALIZATION_MAP: Record<string, string> = {
    'frugt & grønt': 'Frugt og grønt',
    'frugt og grønt': 'Frugt og grønt',
    'brød & kager': 'Brød og kager',
    'brød & bavinchi': 'Brød og kager',
    'brød og kager': 'Brød og kager',
    'drikkevarer': 'Drikkevarer',
    'drikke': 'Drikkevarer',
    'kød, fisk & fjerkræ': 'Kød og fisk',
    'kød & fisk': 'Kød og fisk',
    'kød og fisk': 'Kød og fisk',
    'kolonial': 'Kolonial',
    'mejeri': 'Mejeri og køl',
    'køl': 'Mejeri og køl',
    'ost m.v.': 'Mejeri og køl',
    'mejeri & køl': 'Mejeri og køl',
    'mejeri og køl': 'Mejeri og køl',
    'ost & mejeri': 'Mejeri og køl',
    'nemt & hurtigt': 'Nemt og hurtigt',
    'nemt og hurtigt': 'Nemt og hurtigt',
    'snacks & slik': 'Slik og snacks',
    'slik & snacks': 'Slik og snacks',
    'slik og snacks': 'Slik og snacks',
    'slik': 'Slik og snacks',
    'personlig pleje': 'Personlig pleje',
    'husholdning & rengøring': 'Husholdning',
    'husholdning': 'Husholdning',
    'baby og småbørn': 'Baby og familie',
    'baby og familie': 'Baby og familie',
    'frost': 'Frost',
    'kiosk': 'Kiosk',
    'dyr': 'Dyr'
  }

  /** UI-kanoniske fødevarekategorier på /dagligvarer */
  private readonly FOOD_ONLY_CATEGORIES = [
    'Frugt og grønt',
    'Brød og kager',
    'Kød og fisk',
    'Kolonial',
    'Mejeri og køl',
    'Drikkevarer',
    'Nemt og hurtigt',
    'Slik og snacks',
    'Frost',
    'Kiosk',
  ] as const

  /** Ekstra department-strenge i DB uden egen UI-fane (Planomo FOOD_ONLY_DEPARTMENT_EXTRA). */
  private readonly FOOD_ONLY_DEPARTMENT_EXTRA = [
    'Køl',
    'Mejeri',
    'Kød & fisk',
    'Kød, fisk & fjerkræ',
    'Brød',
    'Kager',
    'Frugt & grønt',
    'Ost m.v.',
    'Mad fra hele verden',
    'Drikke',
    'Slik & snacks',
    'Slik',
    'Nemt & hurtigt',
  ] as const

  private readonly OFFER_SELECT_WITH_PRODUCT = `
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
  `
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
    if (!Number.isFinite(total)) return null
    // offers may be missing in older RPC versions — treat as 0
    const offersCount = Number.isFinite(offers) ? offers : 0
    const categories: { [key: string]: number } = {}
    const rawCats = obj.categories
    if (rawCats && typeof rawCats === 'object' && rawCats !== null && !Array.isArray(rawCats)) {
      for (const [k, v] of Object.entries(rawCats as Record<string, unknown>)) {
        const n = Number(v)
        if (Number.isFinite(n)) categories[k] = n
      }
    }
    return { total, offers: offersCount, categories }
  }

  /** Fast fallback when RPC unavailable: department-join head counts. */
  private async getProductCountsV2FastFallback(foodOnly: boolean = true): Promise<{
    total: number
    categories: { [key: string]: number }
    offers: number
  }> {
    const supabase = createSupabaseServiceClient()
    const foodDepts = foodOnly ? this.getFoodOnlyDepartmentAllowList() : null

    let totalQuery = supabase
      .from('product_offers')
      .select('id, products!inner(department)', { count: 'exact', head: true })
      .eq('is_available', true)
      .neq('source', 'goma')

    let offersQuery = supabase
      .from('product_offers')
      .select('id, products!inner(department)', { count: 'exact', head: true })
      .eq('is_available', true)
      .neq('source', 'goma')
      .not('normal_price', 'is', null)
      .gt('normal_price', 0)

    if (foodDepts) {
      totalQuery = totalQuery.in('products.department', foodDepts)
      offersQuery = offersQuery.in('products.department', foodDepts)
    }

    const [{ count: totalCount, error: totalError }, { count: offersCount, error: offersError }] =
      await Promise.all([totalQuery, offersQuery])

    if (totalError) console.error('Fast counts total error:', totalError)
    if (offersError) console.error('Fast counts offers error:', offersError)

    return {
      total: totalCount || 0,
      categories: {},
      offers: offersCount || 0,
    }
  }

  async getProductCountsV2(foodOnly: boolean = true): Promise<{ total: number; categories: { [key: string]: number }; offers: number }> {
    const now = Date.now()
    const cacheSlot = foodOnly ? 'food' : 'all'
    if (
      this.productCountsCache &&
      this.productCountsCache.slot === cacheSlot &&
      this.productCountsCache.expiresAt > now &&
      !(this.productCountsCache.data.total === 0 && this.productCountsCache.data.offers === 0)
    ) {
      return this.productCountsCache.data
    }

    try {
      const supabase = createSupabaseServiceClient()
      const { data, error } = await supabase.rpc('get_product_counts_v2', { filter_food_only: foodOnly })
      if (!error && data != null) {
        const parsed = this.parseProductCountsRpc(data)
        if (parsed) {
          const mapped = {
            ...parsed,
            categories: this.mapCountsToCanonicalCategories(parsed.categories),
          }
          this.productCountsCache = {
            slot: cacheSlot,
            data: mapped,
            expiresAt: now + this.PRODUCT_COUNTS_CACHE_TTL_MS,
          }
          return mapped
        }
      }
      if (error) {
        console.warn('get_product_counts_v2 RPC failed, using department head-count fallback:', error.message)
      }
    } catch (e) {
      console.warn('get_product_counts_v2 RPC exception, using department head-count fallback:', e)
    }

    const fast = await this.getProductCountsV2FastFallback(foodOnly)
    const mappedFast = {
      ...fast,
      categories: this.mapCountsToCanonicalCategories(fast.categories),
    }
    this.productCountsCache = {
      slot: cacheSlot,
      data: mappedFast,
      expiresAt: now + this.PRODUCT_COUNTS_CACHE_TTL_MS,
    }
    return mappedFast
  }

  /** @deprecated Use getProductCountsV2() instead */
  async getProductCounts(): Promise<{ total: number; categories: { [key: string]: number }; offers: number }> {
    return this.getProductCountsV2(true)
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
    foodOnly: boolean = true,
    organicOnly?: boolean,
    _excludeSnacksAndDrinks?: boolean
  ): Promise<{products: any[]; total: number; hasMore: boolean}> {
    try {
      const supabase = createSupabaseClient()

      const offset = (page - 1) * limit
      const categoryFilter = this.buildCategoryFilterList(categories, foodOnly)

      if (foodOnly && this.hasUserCategorySelection(categories) && categoryFilter.length === 0) {
        return { products: [], total: 0, hasMore: false }
      }

      const implicitFoodOnly = Boolean(foodOnly && !this.hasUserCategorySelection(categories))
      const useFastFoodOfferScan =
        implicitFoodOnly && !search?.trim() && categoryFilter.length === 0

      if (useFastFoodOfferScan) {
        return this.listFoodDepartmentOffers(supabase, page, limit, stores, offersOnly, organicOnly)
      }

      let query = supabase
        .from('product_offers')
        .select(this.OFFER_SELECT_WITH_PRODUCT)
        .eq('is_available', true)
        .neq('source', 'goma')

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
          .overlaps('organic_tags', ['organic-priority', 'organic-animal'])
          .limit(20000) // Should be enough for all organic products
        
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
        query = this.applyFoodDepartmentFilterToOffersQuery(query, true)
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
            let nameQuery = supabase
              .from('product_offers')
              .select('product_id')
              .neq('source', 'goma')
              .or(`name_store.ilike.%${term}%`)
              .limit(1000)

            if (foodOnly) {
              nameQuery = this.applyFoodDepartmentFilterToOffersQuery(
                nameQuery.select('product_id, products!inner(department)'),
                true,
              )
            }

            let categoryQuery = supabase
              .from('products')
              .select('id')
              .or(`department.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%,name_generic.ilike.%${term}%,brand.ilike.%${term}%`)
              .limit(1000)

            if (foodOnly) {
              categoryQuery = this.applyFoodDepartmentFilterToProductsQuery(categoryQuery, true)
            }

            if (organicOnly) {
              categoryQuery = categoryQuery.overlaps('organic_tags', ['organic-priority', 'organic-animal'])
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

        // Run chunks in parallel (with bounded concurrency) instead of
        // sequentially. With ~50 chunks @ 100ms each, sequential = ~5s wait.
        // Parallel-8 = ~700ms. We cap at 8 concurrent so we don't blow up
        // Supabase's connection pool.
        const CHUNK_CONCURRENCY = 8
        const chunkResults = await mapWithConcurrency(chunks, CHUNK_CONCURRENCY, async (chunk, idx) => {
          try {
            let chunkQuery = supabase
              .from('product_offers')
              .select('id, is_on_sale, is_offer_active, discount_percentage, current_price, normal_price, sale_valid_to')
              .eq('is_available', true)
              .neq('source', 'goma')
              .in('product_id', chunk)

            if (stores && stores.length > 0) {
              chunkQuery = chunkQuery.in('store_id', this.mapStoreFilterToIds(stores))
            }

            // IMPORTANT: do not pre-filter on sale flags here; evaluate real offer in-app.
            // Organic filter already applied via productIds intersection above.

            const { data: chunkOffers, error: chunkError } = await chunkQuery

            if (chunkError) {
              console.error(`[CATEGORY FILTER] Error fetching chunk ${idx + 1}/${chunks.length}:`, chunkError)
              if (chunkError.message) console.error(`[CATEGORY FILTER] Error message: ${chunkError.message}`)
              if (chunkError.code) console.error(`[CATEGORY FILTER] Error code: ${chunkError.code}`)
              return null
            }
            return chunkOffers || []
          } catch (error) {
            console.error(`[CATEGORY FILTER] Exception in chunk ${idx + 1}/${chunks.length}:`, error)
            if (error instanceof Error) {
              console.error(`[CATEGORY FILTER] Exception message: ${error.message}`)
              console.error(`[CATEGORY FILTER] Exception stack: ${error.stack}`)
            }
            return null
          }
        })

        for (const rows of chunkResults) {
          if (rows === null) {
            chunkErrors++
            continue
          }
          for (const offer of rows as Array<{
            id?: string | number
            is_on_sale?: boolean
            is_offer_active?: boolean
            discount_percentage?: number | null
            current_price?: number | null
            normal_price?: number | null
            sale_valid_to?: string | null
          }>) {
            if (!offer?.id) continue
            allMatchingOffers.set(String(offer.id), {
              id: String(offer.id),
              is_on_sale: !!offer.is_on_sale,
              is_offer_active: !!offer.is_offer_active,
              discount_percentage: offer.discount_percentage ?? null,
              current_price: offer.current_price ?? null,
              normal_price: offer.normal_price ?? null,
              sale_valid_to: offer.sale_valid_to ?? null,
            })
          }
        }

        if (chunkErrors > 0) {
          console.warn(`[CATEGORY FILTER] ${chunkErrors} out of ${chunks.length} chunks had errors`)
        }
        
        let matchingOffersArray = Array.from(allMatchingOffers.values())
        if (offersOnly) {
          matchingOffersArray = matchingOffersArray.filter((o) => isRealOfferFields(o))
        }

        matchingOffersArray.sort((a, b) => {
          const aOffer = isRealOfferFields(a)
          const bOffer = isRealOfferFields(b)
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
              .neq('source', 'goma')
            
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
          const pricing = resolveOfferDisplayPricing(row)
          return {
            id: row.id,
            name: row.name_store || p.name_generic,
            description: null,
            category: p.category || p.department || null,
            price: pricing.price,
            original_price: pricing.original_price,
            unit: p.unit || 'stk',
            unit_price: row.price_per_unit || row.price_per_kilogram || null,
            is_on_sale: pricing.is_on_sale,
            is_offer_active: pricing.is_offer_active,
            sale_end_date: row.sale_valid_to || null,
            discount_percentage: pricing.discount_percentage,
            image_url: p.image_url || this.getProductPlaceholderImage(),
            store: this.mapStoreIdToDisplayName(row.store_id),
            amount: p.amount ? String(p.amount) : null,
          }
        })

        const finalMapped = offersOnly ? mapped.filter((p) => p.is_on_sale) : mapped

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
        let nameQuery = supabase
          .from('product_offers')
          .select('product_id')
          .neq('source', 'goma')
          .or(`name_store.ilike.%${term}%`)
          .limit(1000)

        if (foodOnly) {
          nameQuery = this.applyFoodDepartmentFilterToOffersQuery(
            nameQuery.select('product_id, products!inner(department)'),
            true,
          )
        }

        let categoryQuery = supabase
          .from('products')
          .select('id')
          .or(`department.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%,name_generic.ilike.%${term}%,brand.ilike.%${term}%`)
          .limit(1000)

        if (foodOnly) {
          categoryQuery = this.applyFoodDepartmentFilterToProductsQuery(categoryQuery, true)
        }
        
        // Apply organic filter to product search if needed
        if (organicOnly) {
          categoryQuery = categoryQuery.overlaps('organic_tags', ['organic-priority', 'organic-animal'])
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

      // Proven tilbud filtreres i app — stol ikke på DB sale flags.
      query = query
        .order('discount_percentage', { ascending: false, nullsFirst: false })
        .order('current_price', { ascending: true })
        .range(offset, offset + (offersOnly ? limit * 8 : limit))

      const { data, error } = await query

      if (error) {
        console.error('Error fetching supermarket products (V2):', error)
        return { products: [], total: 0, hasMore: false }
      }

      let fetched = (data || []) as Array<Record<string, unknown>>
      if (offersOnly) {
        fetched = fetched.filter((row) =>
          isRealOfferFields({
            current_price: row.current_price as number | null,
            normal_price: row.normal_price as number | null,
            sale_valid_to: row.sale_valid_to as string | null,
          }),
        )
      }
      const hasMore = fetched.length > limit
      const pageRows = hasMore ? fetched.slice(0, limit) : fetched

      const mapped = pageRows.map((row: any) => {
        const p = row.products || {}
        const pricing = resolveOfferDisplayPricing(row)

        return {
          id: row.id,
          name: row.name_store || p.name_generic,
          description: null,
          category: p.category || p.department || null,
          price: pricing.price,
          original_price: pricing.original_price,
          unit: p.unit || 'stk',
          unit_price: row.price_per_unit || row.price_per_kilogram || null,
          is_on_sale: pricing.is_on_sale,
          is_offer_active: pricing.is_offer_active,
          sale_end_date: row.sale_valid_to || null,
          discount_percentage: pricing.discount_percentage,
          image_url: p.image_url || this.getProductPlaceholderImage(),
          store: this.mapStoreIdToDisplayName(row.store_id),
          amount: p.amount ? String(p.amount) : null,
        }
      })

      const finalMapped = offersOnly ? mapped.filter((p) => p.is_on_sale) : mapped

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
      
      // Approximate total: we no longer do an exact COUNT for performance.
      // Consumers (dagligvarer page) only use hasMore; meal-plan generator
      // logs `total` for diagnostics where exactness is not required.
      const total = offset + finalMapped.length + (hasMore ? 1 : 0)

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
      'Brød og kager': ['Brød', 'Kager', 'Brød & Bavinchi'],
      'Frugt og grønt': ['Frugt & grønt'],
      'Drikkevarer': ['Drikke'],
      'Slik og snacks': ['Slik & snacks', 'Slik'],
      'Nemt og hurtigt': ['Nemt & hurtigt'],
    }
    return map[canonical] || []
  }

  /** Map raw DB department buckets to canonical /dagligvarer category ids. */
  private mapCountsToCanonicalCategories(categories: { [key: string]: number }): { [key: string]: number } {
    const result: { [key: string]: number } = {}
    for (const [raw, count] of Object.entries(categories)) {
      const canonical = this.normalizeCategoryInput(raw) || raw
      result[canonical] = (result[canonical] || 0) + count
    }
    return result
  }

  /** Map offer row → dagligvarer product shape. */
  private mapOfferRowToProduct(row: Record<string, any>) {
    const p = row.products || {}
    const pricing = resolveOfferDisplayPricing(row)
    return {
      id: row.id,
      name: row.name_store || p.name_generic,
      description: null,
      category: p.category || p.department || null,
      price: pricing.price,
      original_price: pricing.original_price,
      unit: p.unit || 'stk',
      unit_price: row.price_per_unit || row.price_per_kilogram || null,
      is_on_sale: pricing.is_on_sale,
      is_offer_active: pricing.is_offer_active,
      sale_end_date: row.sale_valid_to || null,
      discount_percentage: pricing.discount_percentage,
      image_url: p.image_url || this.getProductPlaceholderImage(),
      store: this.mapStoreIdToDisplayName(row.store_id),
      amount: p.amount ? String(p.amount) : null,
    }
  }

  /** Food departments — default /dagligvarer scan (Planomo jun 2026). */
  private async listFoodDepartmentOffers(
    supabase: ReturnType<typeof createSupabaseClient>,
    page: number,
    limit: number,
    stores?: string[],
    offersOnly?: boolean,
    organicOnly?: boolean,
  ): Promise<{ products: any[]; total: number; hasMore: boolean }> {
    // Primær vej: RPC gør join + sort + pagination i Postgres (reliable, ingen cold timeout).
    const rpc = await this.listFoodDepartmentOffersViaRpc(page, limit, stores, offersOnly, organicOnly)
    if (rpc) return rpc

    // Fallback hvis RPC ikke er deployet endnu.
    return this.listFoodDepartmentOffersAppSide(supabase, page, limit, stores, offersOnly, organicOnly)
  }

  private async listFoodDepartmentOffersViaRpc(
    page: number,
    limit: number,
    stores?: string[],
    offersOnly?: boolean,
    organicOnly?: boolean,
  ): Promise<{ products: any[]; total: number; hasMore: boolean } | null> {
    try {
      const supabase = createSupabaseServiceClient()
      const offset = (page - 1) * limit
      const storeIds = stores && stores.length > 0 ? this.mapStoreFilterToIds(stores) : null
      // Hent limit+1 for at kunne sige hasMore uden separat count.
      const { data, error } = await supabase.rpc('get_food_offers_v2', {
        p_offers_only: !!offersOnly,
        p_limit: limit + 1,
        p_offset: offset,
        p_stores: storeIds,
        p_organic_only: !!organicOnly,
      })
      if (error) {
        console.warn('get_food_offers_v2 RPC unavailable, using app-side fallback:', error.message)
        return null
      }
      const rows = Array.isArray(data) ? data : []
      const hasMore = rows.length > limit
      const pageRows = hasMore ? rows.slice(0, limit) : rows
      return {
        products: pageRows.map((row: any) => this.mapOfferRowToProduct(this.normalizeRpcOfferRow(row))),
        total: offset + pageRows.length + (hasMore ? 1 : 0),
        hasMore,
      }
    } catch (e) {
      console.warn('get_food_offers_v2 RPC exception, using app-side fallback:', e)
      return null
    }
  }

  /** RPC returnerer flade kolonner — pak product-felter ind så mapOfferRowToProduct passer. */
  private normalizeRpcOfferRow(row: Record<string, any>): Record<string, any> {
    return {
      ...row,
      products: {
        id: row.product_id,
        name_generic: row.name_generic,
        brand: row.brand,
        category: row.category,
        subcategory: row.subcategory,
        department: row.department,
        unit: row.unit,
        amount: row.amount,
        image_url: row.image_url,
      },
    }
  }

  private async listFoodDepartmentOffersAppSide(
    supabase: ReturnType<typeof createSupabaseClient>,
    page: number,
    limit: number,
    stores?: string[],
    offersOnly?: boolean,
    organicOnly?: boolean,
  ): Promise<{ products: any[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit
    const foodDeptSet = new Set(
      this.getFoodOnlyDepartmentAllowList().map((d) => d.toLowerCase().trim()),
    )

    const isFoodRow = (row: Record<string, any>) => {
      const dept = String(row.products?.department ?? '').trim().toLowerCase()
      return dept.length > 0 && foodDeptSet.has(dept)
    }

    const storeIds = stores && stores.length > 0 ? this.mapStoreFilterToIds(stores) : null

    // Øko (fallback): hent øko-produkt-IDs og begræns til dem.
    let organicIdSet: Set<string> | null = null
    if (organicOnly) {
      const { data: orgRows } = await supabase
        .from('products')
        .select('id')
        .overlaps('organic_tags', ['organic-priority', 'organic-animal'])
        .limit(20000)
      organicIdSet = new Set((orgRows || []).map((r: any) => String(r.id)))
      if (organicIdSet.size === 0) return { products: [], total: 0, hasMore: false }
    }
    const passesOrganic = (row: Record<string, any>) =>
      !organicIdSet || organicIdSet.has(String(row.product_id))

    if (offersOnly) {
      // Pre-filter normal_price IS NOT NULL so sorting only touches the offer set (fast).
      // Over-fetch so the in-app food + proven-offer filter still fills the page.
      const fetchSize = Math.min((offset + limit) * 3 + 100, 1500)
      let q = supabase
        .from('product_offers')
        .select(this.OFFER_SELECT_WITH_PRODUCT)
        .eq('is_available', true)
        .neq('source', 'goma')
        .not('normal_price', 'is', null)
        .order('discount_percentage', { ascending: false, nullsFirst: false })
        .order('current_price', { ascending: true })
        .limit(fetchSize)

      if (storeIds) q = q.in('store_id', storeIds)

      const { data, error } = await q
      if (error) {
        console.error('listFoodDepartmentOffers (offers) error:', error)
        return { products: [], total: 0, hasMore: false }
      }

      const products = (data || [])
        .filter(isFoodRow)
        .filter(passesOrganic)
        .filter((row) => isRealOfferFields(row))
        .map((row) => this.mapOfferRowToProduct(row))

      return {
        products: products.slice(offset, offset + limit),
        total: products.length,
        hasMore: products.length > offset + limit,
      }
    }

    // Alle produkter: ingen tung sortering over 160k rækker — paginér rå og filtrér food i app.
    const fetchSize = (offset + limit) * 2 + 50
    let q = supabase
      .from('product_offers')
      .select(this.OFFER_SELECT_WITH_PRODUCT)
      .eq('is_available', true)
      .neq('source', 'goma')
      .order('id', { ascending: true })
      .range(0, fetchSize - 1)

    if (storeIds) q = q.in('store_id', storeIds)

    const { data, error } = await q
    if (error) {
      console.error('listFoodDepartmentOffers (all) error:', error)
      return { products: [], total: 0, hasMore: false }
    }

    const products = (data || [])
      .filter(isFoodRow)
      .filter(passesOrganic)
      .map((row) => this.mapOfferRowToProduct(row))
    products.sort((a, b) => {
      if (a.is_on_sale && !b.is_on_sale) return -1
      if (!a.is_on_sale && b.is_on_sale) return 1
      return (b.discount_percentage || 0) - (a.discount_percentage || 0)
    })

    return {
      products: products.slice(offset, offset + limit),
      total: products.length,
      hasMore: products.length > offset + limit,
    }
  }

  private applyFoodDepartmentFilterToOffersQuery<T extends { in: (col: string, vals: string[]) => T }>(
    query: T,
    foodOnly: boolean,
  ): T {
    if (!foodOnly) return query
    return query.in('products.department', this.getFoodOnlyDepartmentAllowList())
  }

  private applyFoodDepartmentFilterToProductsQuery<T extends { in: (col: string, vals: string[]) => T }>(
    query: T,
    foodOnly: boolean,
  ): T {
    if (!foodOnly) return query
    return query.in('department', this.getFoodOnlyDepartmentAllowList())
  }

  private getFoodOnlyDepartmentAllowList(): string[] {
    return Array.from(
      new Set([
        ...this.FOOD_ONLY_CATEGORIES,
        ...getFoodCatalogLabelsForFilter(),
        ...this.FOOD_ONLY_DEPARTMENT_EXTRA,
      ]),
    )
  }

  private hasUserCategorySelection(categories?: string[]): boolean {
    const normalized = (categories || [])
      .map((cat) => this.normalizeCategoryInput(cat))
      .filter((cat): cat is string => Boolean(cat))
    return normalized.length > 0
  }

  private async findProductIdsForCategories(categories: string[]): Promise<string[]> {
    // Cache lookup: same categories produce the same answer for ~5 minutes.
    // Repeat clicks on the same filter (or quick toggle of unrelated filters)
    // skip 2-4 ilike queries entirely.
    const cacheKey = categories
      .map((c) => (c || '').trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join('|')
    const now = Date.now()
    if (cacheKey) {
      const cached = this.categoryProductIdsCache.get(cacheKey)
      if (cached && cached.expiresAt > now) {
        return cached.data
      }
    }

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

      for (const alias of aliasesToTry) {
        const { data: exactDept, error: deptErr } = await supabase
          .from('products')
          .select('id')
          .ilike('department', alias)
          .limit(10000)

        if (!deptErr && exactDept?.length) {
          exactDept.forEach((r) => r?.id && seen.add(r.id))
        }

        const { data: exactCat, error: catErr } = await supabase
          .from('products')
          .select('id')
          .ilike('category', alias)
          .limit(10000)

        if (!catErr && exactCat?.length) {
          exactCat.forEach((r) => r?.id && seen.add(r.id))
        }
      }

      // Fallback: variant OR query for partial matches
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
    const result = Array.from(seen)
    if (cacheKey) {
      this.categoryProductIdsCache.set(cacheKey, {
        data: result,
        expiresAt: now + this.CATEGORY_PRODUCT_IDS_TTL_MS,
      })
    }
    return result
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