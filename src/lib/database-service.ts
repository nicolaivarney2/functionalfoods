import { createSupabaseClient } from './supabase'
import { Recipe } from '@/types/recipe'
import { IngredientTag } from '@/lib/ingredient-system/types'
import { SupermarketProduct } from '@/lib/supermarket-scraper/types'

export class DatabaseService {
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
    'Drikkevarer',
    'Kød og fisk',
    'Kolonial',
    'Mejeri og køl',
    'Nemt og hurtigt',
    'Slik og snacks'
  ]
  /**
   * Get published recipes from database (for frontend use)
   */
  async getRecipes(): Promise<Recipe[]> {
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
    
    console.log(`🔍 Raw database data: ${data?.length || 0} published recipes found`)
    if (data && data.length > 0) {
      console.log('📋 First published recipe from DB:', {
        id: data[0].id,
        title: data[0].title,
        imageUrl: data[0].imageUrl,
        totalTime: data[0].totalTime,
        preparationTime: data[0].preparationTime,
        cookingTime: data[0].cookingTime
      })
    }
    
    // Database already uses camelCase, no transformation needed
    console.log(`✅ Returning ${data?.length || 0} published recipes to frontend`)
    return data || []
  }

  /**
   * Get all recipes from database (including drafts) - for admin use only
   */
  async getAllRecipes(): Promise<Recipe[]> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('updatedAt', { ascending: false })
    
    if (error) {
      console.error('Error fetching all recipes:', error)
      return []
    }
    
    console.log(`🔍 Raw database data: ${data?.length || 0} recipes found (all statuses)`)
    if (data && data.length > 0) {
      console.log('📋 First raw recipe from DB:', {
        id: data[0].id,
        title: data[0].title,
        imageUrl: data[0].imageUrl,
        totalTime: data[0].totalTime,
        preparationTime: data[0].preparationTime,
        cookingTime: data[0].cookingTime
      })
    }
    
    // Database already uses camelCase, no transformation needed
    console.log(`✅ Returning ${data?.length || 0} recipes directly from database`)
    return data || []
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

  /**
   * NEW: Get product counts from new structure (product_offers + products)
   */
  async getProductCountsV2(): Promise<{total: number, categories: {[key: string]: number}, offers: number}> {
    try {
      const supabase = createSupabaseClient()
      
      // Get total count of available offers
      const { count: totalCount, error: totalError } = await supabase
        .from('product_offers')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)
      
      if (totalError) {
        console.error('Error getting total count (V2):', totalError)
        return { total: 0, categories: {}, offers: 0 }
      }
      
      // Get category counts by joining with products table
      // Use pagination to handle large datasets
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
        
        // Safety break
        if (start > 50000) {
          console.warn('Breaking category fetch at 50000 to prevent infinite loop')
          break
        }
      }
      
      console.log(`🔍 Fetched ${allCategoryData.length} product categories out of ${total} total offers`)
      
      // Count categories (use department first, fallback to category)
      const categoryCounts = allCategoryData.reduce((acc: {[key: string]: number}, offer: any) => {
        const product = offer.products || {}
        const category = product.department || product.category || 'Ukategoriseret'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {})
      
      // Get real offers count (where is_on_sale = true AND current_price < normal_price)
      // Supabase doesn't support direct column comparison, so we fetch a sample and count
      // For efficiency, we'll use a reasonable sample size and extrapolate
      const sampleSize = Math.min(5000, total)
      const { data: offersSample, error: offersError } = await supabase
        .from('product_offers')
        .select('current_price, normal_price, is_on_sale')
        .eq('is_available', true)
        .eq('is_on_sale', true)
        .limit(sampleSize)
      
      let realOffersCount = 0
      if (offersError) {
        console.error('Error getting offers sample:', offersError)
        // Fallback: count all is_on_sale = true
        const { count: fallbackCount } = await supabase
          .from('product_offers')
          .select('*', { count: 'exact', head: true })
          .eq('is_available', true)
          .eq('is_on_sale', true)
        
        realOffersCount = fallbackCount || 0
      } else if (offersSample && offersSample.length > 0) {
        // Count real offers (where current_price < normal_price)
        const realOffersInSample = offersSample.filter(offer => {
          const currentPrice = offer.current_price || 0
          const normalPrice = offer.normal_price || 0
          return normalPrice > currentPrice && (normalPrice - currentPrice) > 0.01
        }).length
        
        // If we sampled less than total, extrapolate
        if (sampleSize < total) {
          const ratio = realOffersInSample / offersSample.length
          const { count: totalOnSale } = await supabase
            .from('product_offers')
            .select('*', { count: 'exact', head: true })
            .eq('is_available', true)
            .eq('is_on_sale', true)
          
          realOffersCount = Math.round((totalOnSale || 0) * ratio)
        } else {
          realOffersCount = realOffersInSample
        }
      } else {
        // No offers in sample, count all is_on_sale = true as fallback
        const { count: fallbackCount } = await supabase
          .from('product_offers')
          .select('*', { count: 'exact', head: true })
          .eq('is_available', true)
          .eq('is_on_sale', true)
        
        realOffersCount = fallbackCount || 0
      }
      
      console.log(`🔍 Product counts (V2) - Total: ${totalCount}, Real Offers: ${realOffersCount}, Categories: ${Object.keys(categoryCounts).length}`)
      console.log(`🔍 Category breakdown:`, categoryCounts)
      
      return {
        total: totalCount || 0,
        categories: categoryCounts,
        offers: realOffersCount
      }
    } catch (error) {
      console.error('Error in getProductCountsV2:', error)
      return { total: 0, categories: {}, offers: 0 }
    }
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
    foodOnly?: boolean
  ): Promise<{products: any[]; total: number; hasMore: boolean}> {
    try {
      const supabase = createSupabaseClient()

      const offset = (page - 1) * limit

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

      if (offersOnly) {
        query = query.eq('is_on_sale', true)
      }

      if (categories && categories.length > 0) {
        // Robust two-step approach:
        // 1) Find matching product_ids in products using iterative ilike queries
        // 2) Filter offers by those product_ids
        const productIds = await this.findProductIdsForCategories(categories)
        if (productIds.length === 0) {
          return { products: [], total: 0, hasMore: false }
        }
        // Avoid extremely large IN lists: cap to a reasonable number
        const MAX_IDS = 10000
        const limitedIds = productIds.slice(0, MAX_IDS)
        query = query.in('product_id', limitedIds)
      }

      if (search && search.trim()) {
        // Forbedret tekstsøgning i butiksnavn + globalt navn + brand + kategori-felter
        const term = search.trim()
        console.log(`🔍 Searching for: "${term}"`)
        
        // Find products matching the search term in name/brand fields
        const { data: nameMatches, error: nameErr } = await supabase
          .from('product_offers')
          .select('product_id')
          .or(`name_store.ilike.%${term}%`)
          .limit(1000)
        
        // Also find products matching in category fields
        const { data: categoryMatches, error: catSearchErr } = await supabase
          .from('products')
          .select('id')
          .or(`department.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%,name_generic.ilike.%${term}%,brand.ilike.%${term}%`)
          .limit(1000)
        
        const matchingProductIds = new Set<string>()
        
        if (!nameErr && nameMatches) {
          nameMatches.forEach((m: any) => m?.product_id && matchingProductIds.add(m.product_id))
        }
        
        if (!catSearchErr && categoryMatches) {
          categoryMatches.forEach((m: any) => m?.id && matchingProductIds.add(m.id))
        }
        
        if (matchingProductIds.size > 0) {
          console.log(`🔍 Found ${matchingProductIds.size} unique products matching search term`)
          query = query.in('product_id', Array.from(matchingProductIds))
        } else {
          // No matches found, return empty result
          console.log(`🔍 No products found matching search term`)
          return { products: [], total: 0, hasMore: false }
        }
      }

      query = query
        .order('is_on_sale', { ascending: false }) // tilbud først
        .order('discount_percentage', { ascending: false, nullsFirst: false })
        .order('current_price', { ascending: true })
        .range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching supermarket products (V2):', error)
        return { products: [], total: 0, hasMore: false }
      }

      const total = count || 0
      const hasMore = offset + limit < total

      const mapped = (data || []).map((row: any) => {
        const p = row.products || {}
        
        // Debug: Log if products object is missing
        if (!row.products && categories && categories.length > 0) {
          console.warn(`⚠️ Missing products object for offer ${row.id}, product_id: ${row.product_id}`)
        }

        const price = row.current_price || 0
        const originalPrice = row.normal_price || row.current_price || 0
        const isOnSale = !!row.is_on_sale && originalPrice > price
        const priceDiff = originalPrice - price
        const discountPct =
          isOnSale && originalPrice > 0 && priceDiff > 0.01
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
          is_on_sale: isOnSale,
          discount_percentage: discountPct,
          image_url: p.image_url || this.getProductPlaceholderImage(),
          store: this.mapStoreIdToDisplayName(row.store_id),
          amount: p.amount ? String(p.amount) : null,
        }
      })

      return { products: mapped, total, hasMore }
    } catch (error) {
      console.error('Error in getSupermarketProductsV2:', error)
      return { products: [], total: 0, hasMore: false }
    }
  }

  /**
   * Helper: find product_ids whose department/category matches any of the provided categories.
   * Uses iterative ilike to avoid brittle OR strings and supports URL-decoded variants.
   */
  private async findProductIdsForCategories(categories: string[]): Promise<string[]> {
    const supabase = createSupabaseClient()
    const seen = new Set<string>()

    const expandedVariants = (cat: string): string[] => {
      const variants = new Set<string>()
      const raw = cat || ''
      const decoded = (() => { try { return decodeURIComponent(raw) } catch { return raw } })()
      const normalized = decoded.trim().replace(/\s+/g, ' ')
      variants.add(normalized)
      variants.add(normalized.toLowerCase())
      // Replace & with og and vice versa - be more aggressive
      variants.add(normalized.replace(/&/g, ' og ').replace(/\s+/g, ' ').trim())
      variants.add(normalized.replace(/\s+og\s+/g, ' & ').replace(/\s+/g, ' ').trim())
      // Also try without spaces around &
      variants.add(normalized.replace(/&/g, 'og'))
      variants.add(normalized.replace(/\s+og\s+/g, '&'))
      // Replace commas with space
      variants.add(normalized.replace(/,/g, ' '))
      // Remove common suffixes
      variants.add(normalized.replace(/\s+og\s+grøntsager?$/i, ''))
      variants.add(normalized.replace(/\s+grøntsager?$/i, ''))
      return Array.from(variants).filter(Boolean)
    }

    console.log(`🔍 Finding product IDs for categories: ${categories.join(', ')}`)

    for (const cat of categories) {
      const variants = expandedVariants(cat)
      console.log(`🔍 Expanded variants for "${cat}":`, variants)
      
      for (const v of variants) {
        // Search department
        const { data: depRows, error: depErr } = await supabase
          .from('products')
          .select('id')
          .ilike('department', `%${v}%`)
          .limit(5000)
        if (!depErr && depRows) {
          depRows.forEach(r => r?.id && seen.add(r.id))
          if (depRows.length > 0) {
            console.log(`  ✅ Found ${depRows.length} products in department matching "${v}"`)
          }
        } else if (depErr) {
          console.error(`  ❌ Error searching department for "${v}":`, depErr)
        }
        
        // Search category
        const { data: catRows, error: catErr } = await supabase
          .from('products')
          .select('id')
          .ilike('category', `%${v}%`)
          .limit(5000)
        if (!catErr && catRows) {
          catRows.forEach(r => r?.id && seen.add(r.id))
          if (catRows.length > 0) {
            console.log(`  ✅ Found ${catRows.length} products in category matching "${v}"`)
          }
        } else if (catErr) {
          console.error(`  ❌ Error searching category for "${v}":`, catErr)
        }
        
        // Search subcategory
        const { data: subcatRows, error: subcatErr } = await supabase
          .from('products')
          .select('id')
          .ilike('subcategory', `%${v}%`)
          .limit(5000)
        if (!subcatErr && subcatRows) {
          subcatRows.forEach(r => r?.id && seen.add(r.id))
          if (subcatRows.length > 0) {
            console.log(`  ✅ Found ${subcatRows.length} products in subcategory matching "${v}"`)
          }
        } else if (subcatErr) {
          console.error(`  ❌ Error searching subcategory for "${v}":`, subcatErr)
        }
      }
    }

    console.log(`🔍 Total unique product IDs found: ${seen.size}`)
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
      '365discount': '365-discount', // Goma uses "365discount" (no space)
      '365 Discount': '365-discount', // Also support display name
      'Lidl': 'lidl',
      'Bilka': 'bilka',
      'Nemlig': 'nemlig',
      'MENY': 'meny', // Goma uses "MENY" (not "MENU")
      'MENU': 'meny', // Also support old name for backwards compatibility
      'Spar': 'spar',
      'Kvickly': 'kvickly',
      'superbrugsen': 'super-brugsen', // Goma uses "superbrugsen" (no space, lowercase)
      'Super Brugsen': 'super-brugsen', // Also support display name
      'Brugsen': 'brugsen',
      'Løvbjerg': 'løvbjerg',
      'ABC Lavpris': 'abc-lavpris',
      // Note: Føtex removed - Goma has no products for this store
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
        return allowed
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

  private escapeIlikeTerm(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/,/g, '\\,')
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
        const { data, error, count } = await supabase
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
      // Use anon client for public API access
      const supabase = createSupabaseClient()
      
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
      
      const { data, error } = await supabase
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
      
      const { data, error } = await supabase
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
      const { data: recipesTable, error: recipesError } = await supabase
        .from('recipes')
        .select('count', { count: 'exact', head: true })
      
      const { data: ingredientsTable, error: ingredientsError } = await supabase
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
      const { data, error } = await supabase.from('recipes').select('count', { count: 'exact', head: true })
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