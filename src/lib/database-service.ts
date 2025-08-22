import { createSupabaseClient } from './supabase'
import { Recipe } from '@/types/recipe'
import { IngredientTag } from '@/lib/ingredient-system/types'

// Define SupermarketProduct interface locally since the import doesn't exist
interface SupermarketProduct {
  id: string
  name: string
  description: string
  category: string
  subcategory: string
  price: number
  originalPrice: number
  unit: string
  unitPrice: number
  isOnSale: boolean
  saleEndDate: string | null
  imageUrl: string | null
  store: string
  available: boolean
  temperatureZone: string | null
  nutritionInfo: Record<string, string>
  labels: string[]
  lastUpdated: string
  source: string
}

export class DatabaseService {
  /**
   * Get all recipes from database (published only) - for frontend use
   */
  async getRecipes(): Promise<Recipe[]> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('updatedAt', { ascending: false })
    
    if (error) {
      console.error('Error fetching recipes:', error)
      return []
    }
    
    console.log(`🔍 Raw database data: ${data?.length || 0} recipes found`)
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
   * Get all supermarket products from the database
   */
  async getSupermarketProducts(): Promise<SupermarketProduct[]> {
    try {
      // Use service role client for admin operations to get all products
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase service role key')
        return []
      }
      
      // Create service role client
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceRoleKey)
      
      const { data, error } = await supabase
        .from('supermarket_products')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching supermarket products:', error)
        return []
      }

      console.log(`🔍 Database service: Found ${data?.length || 0} products`)
      return data || []
    } catch (error) {
      console.error('Error in getSupermarketProducts:', error)
      return []
    }
  }

  /**
   * Update an existing supermarket product
   */
  async updateSupermarketProduct(product: SupermarketProduct): Promise<boolean> {
    try {
      const { error } = await createSupabaseClient()
        .from('supermarket_products')
        .update({
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
          available: product.available,
          temperatureZone: product.temperatureZone,
          nutritionInfo: product.nutritionInfo,
          labels: product.labels,
          lastUpdated: product.lastUpdated
        })
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