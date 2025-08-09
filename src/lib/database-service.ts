import { supabase } from './supabase'
import { Recipe } from '@/types/recipe'
import { IngredientTag } from '@/lib/ingredient-system/types'

export class DatabaseService {
  /**
   * Get all recipes from database
   */
  async getRecipes(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
    
    if (error) {
      console.error('Error fetching recipes:', error)
      return []
    }
    
    console.log(`🔍 Raw database data: ${data?.length || 0} recipes found`)
    if (data && data.length > 0) {
      console.log('📋 First raw recipe from DB:', {
        id: data[0].id,
        title: data[0].title,
        imageurl: data[0].imageurl,
        totaltime: data[0].totaltime
      })
    }
    
    // Transform snake_case database fields to camelCase for frontend
    const transformedRecipes = (data || []).map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      shortDescription: recipe.shortdescription,
      imageUrl: recipe.imageurl,
      imageAlt: recipe.imagealt,
      preparationTime: recipe.preparationtime,
      cookingTime: recipe.cookingtime,
      totalTime: recipe.totaltime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
      dietaryCategories: recipe.dietarycategories || [],
      mainCategory: recipe.maincategory,
      subCategories: recipe.subcategories || [],
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      publishedAt: recipe.publishedat ? new Date(recipe.publishedat) : new Date(),
      updatedAt: recipe.updatedat ? new Date(recipe.updatedat) : new Date(),
      metaTitle: recipe.metatitle,
      metaDescription: recipe.metadescription,
      keywords: recipe.keywords || [],
      author: recipe.author,
      slug: recipe.slug,
      rating: recipe.rating,
      reviewCount: recipe.reviewcount,
      prepTimeISO: recipe.preptimeiso,
      cookTimeISO: recipe.cooktimeiso,
      totalTimeISO: recipe.totaltimeiso,
      nutritionalInfo: recipe.nutritionalinfo // Complete nutritional data from Frida DTU
    }))
    
    console.log(`✅ Transformed ${transformedRecipes.length} recipes for frontend`)
    return transformedRecipes
  }

  /**
   * Get all ingredients from database
   */
  async getIngredients(): Promise<IngredientTag[]> {
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
      updatedAt: new Date(ingredient.updated_at || ingredient.created_at)
    }))
    
    return transformedIngredients
  }

  /**
   * Generate unique IDs for recipes that don't have one
   */
  async assignUniqueIds(recipes: Recipe[]): Promise<Recipe[]> {
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
    try {
      console.log(`💾 Attempting to save ${recipes.length} recipes...`)
      
      // Assign unique IDs to recipes that don't have one
      const recipesWithIds = await this.assignUniqueIds(recipes)
      
      // Filter recipes to only include columns that exist in the database
      const filteredRecipes = recipesWithIds.map(recipe => {
        const filteredRecipe: any = {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          calories: recipe.calories || 0,
          protein: recipe.protein || 0,
          carbs: recipe.carbs || 0,
          fat: recipe.fat || 0,
          fiber: recipe.fiber || 0,
          keywords: recipe.keywords,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          servings: recipe.servings || 2,
          difficulty: recipe.difficulty || 'Nem',
          author: recipe.author || 'Functional Foods'
        }
        
        // Add optional fields if they exist (only include columns we know exist)
        if (recipe.slug) filteredRecipe.slug = recipe.slug
        
        // Add default values for fields that frontend expects but don't exist in database
        filteredRecipe.shortdescription = recipe.shortDescription || null
        filteredRecipe.preparationtime = recipe.preparationTime || 0
        filteredRecipe.cookingtime = recipe.cookingTime || 0
        filteredRecipe.totaltime = recipe.totalTime || (recipe.preparationTime || 0) + (recipe.cookingTime || 0)
        filteredRecipe.metatitle = recipe.metaTitle || null
        filteredRecipe.metadescription = recipe.metaDescription || null
        filteredRecipe.maincategory = recipe.mainCategory || null
        filteredRecipe.subcategories = recipe.subCategories || null
        filteredRecipe.dietarycategories = recipe.dietaryCategories && recipe.dietaryCategories.length > 0 ? recipe.dietaryCategories : null
        filteredRecipe.imageurl = recipe.imageUrl || '/images/recipe-placeholder.jpg'
        filteredRecipe.imagealt = recipe.imageAlt || null
        filteredRecipe.publishedat = recipe.publishedAt ? (typeof recipe.publishedAt === 'string' ? recipe.publishedAt : recipe.publishedAt.toISOString()) : new Date().toISOString()
        filteredRecipe.updatedat = recipe.updatedAt ? (typeof recipe.updatedAt === 'string' ? recipe.updatedAt : recipe.updatedAt.toISOString()) : new Date().toISOString()
        filteredRecipe.rating = recipe.rating || null
        filteredRecipe.reviewcount = recipe.reviewCount || null
        filteredRecipe.preptimeiso = recipe.prepTimeISO || null
        filteredRecipe.cooktimeiso = recipe.cookTimeISO || null
        filteredRecipe.totaltimeiso = recipe.totalTimeISO || null
        
        // Store complete nutritional information as JSONB
        if (recipe.nutritionalInfo) {
          filteredRecipe.nutritionalinfo = recipe.nutritionalInfo
        }
        
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
        // Note: commonNames, isActive, createdAt, updatedAt, nutritionalInfo columns don't exist in the database
        // so we exclude them to prevent errors
        
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