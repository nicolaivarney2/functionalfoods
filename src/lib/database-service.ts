import { createSupabaseClient } from './supabase'
import { Recipe } from '@/types/recipe'
import { IngredientTag } from '@/lib/ingredient-system/types'
import { SupermarketProduct } from '@/lib/supermarket-scraper/types'

export class DatabaseService {
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
   * Get optimized product counts and category breakdown without fetching full products
   */
  async getProductCounts(): Promise<{total: number, categories: {[key: string]: number}, offers: number}> {
    try {
      const supabase = createSupabaseClient()
      
      // Get total count efficiently
      const { count: totalCount, error: totalError } = await supabase
        .from('supermarket_products')
        .select('*', { count: 'exact', head: true })
      
      if (totalError) {
        console.error('Error getting total count:', totalError)
        return { total: 0, categories: {}, offers: 0 }
      }
      
      // Get ALL categories using pagination to avoid 1000 row limit
      let allCategoryData: any[] = []
      let start = 0
      const batchSize = 1000
      const total = totalCount || 0
      
      while (start < total) {
        const end = Math.min(start + batchSize - 1, total - 1)
        const { data: batchData, error: batchError } = await supabase
          .from('supermarket_products')
          .select('category')
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
        if (start > 10000) {
          console.warn('Breaking category fetch at 10000 to prevent infinite loop')
          break
        }
      }
      
      console.log(`🔍 Fetched ${allCategoryData.length} product categories out of ${total} total products`)
      
      // Count categories
      const categoryCounts = allCategoryData.reduce((acc: {[key: string]: number}, product: any) => {
        const category = product.category || 'Ukategoriseret'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {})
      
      // Get offers count efficiently - but we need to process them to get real offers
      // For now, get a sample to count real offers
      const { data: sampleOffers, error: offersError } = await supabase
        .from('supermarket_products')
        .select('price, original_price, is_on_sale')
        .eq('is_on_sale', true)
        .limit(1000)
      
      // Count real offers (where price < original_price)
      let realOffersCount = 0
      if (sampleOffers) {
        realOffersCount = sampleOffers.filter(product => {
          const price = product.price || 0
          const originalPrice = product.original_price || 0
          const priceDifference = originalPrice - price
          return priceDifference > 0.01 // Real discount
        }).length
      }
      
      console.log(`🔍 Product counts - Total: ${totalCount}, Real Offers: ${realOffersCount}, Categories: ${Object.keys(categoryCounts).length}`)
      console.log(`🔍 Category breakdown:`, categoryCounts)
      
      return {
        total: totalCount || 0,
        categories: categoryCounts,
        offers: realOffersCount
      }
    } catch (error) {
      console.error('Error in getProductCounts:', error)
      return { total: 0, categories: {}, offers: 0 }
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
      
      // Since offers are now default, we can use a smaller expansion for better performance
      const expandedLimit = Math.min(500, limit * 10) // Fetch 10x more products (much more reasonable)
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
      .order('name', { ascending: true })
    
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

          // Process products with discount logic
      const processedProducts = (data || []).map(product => {
        const price = product.price || 0
        const originalPrice = product.original_price || 0
        const isMarkedOnSale = product.is_on_sale || false
        
        const hasValidPrices = price > 0 && originalPrice > 0
        const priceDifference = originalPrice - price
        const isActualDiscount = priceDifference > 0.01
        
        // 🔥 NEW LOGIC: Show offers even if original_price === price (for now)
        // This allows products marked as offers to display while we fix their original prices
        const isRealOffer = isMarkedOnSale && hasValidPrices
        
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
      
      console.log(`🔧 Updating product ${product.id} with:`, updateData)
      
      const { error } = await createSupabaseClient()
        .from('supermarket_products')
        .update(updateData)
        .eq('id', product.id)

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