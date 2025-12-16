import { Recipe, Ingredient, RecipeStep } from '@/types/recipe'
import { FridaDTUMatcher } from './frida-dtu-matcher'
import { downloadAndStoreImage } from './image-downloader'

export interface RawRecipeData {
  id?: string
  title: string
  description: string
  shortDescription: string
  preparationTime: number
  cookingTime: number
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  mainCategory: string
  subCategories: string[]
  dietaryCategories: string[]
  ingredients: Array<{
    name: string
    amount: number
    unit: string
    notes?: string
  }>
  instructions: Array<{
    stepNumber: number
    instruction: string
    time?: number
    tips?: string
  }>
  imageUrl: string
  imageAlt: string
  servings: number
  difficulty: 'Nem' | 'Mellem' | 'Svær'
  author: string
  publishedAt: string
  rating?: number
  reviewCount?: number
}

// Ketoliv JSON format interface
interface KetolivRecipe {
  id: number
  slug: string
  name: string
  summary: string
  image_url: string
  pin_image_url: string
  servings: string
  prep_time: string
  cook_time: string
  total_time: string
  tags: {
    course: string[]
    cuisine: string[]
    keyword: string[]
  }
  ingredients_flat: Array<{
    amount: string
    unit: string
    name: string
    notes: string
    type: string
  }>
  instructions_flat: Array<{
    name: string
    text: string
    type: string
    image_url: string
  }>
  nutrition: {
    calories: number
    carbohydrates: number
    protein: number
    fat: number
    saturated_fat: number
    fiber: number
    sugar: number
    sodium: number
  }
  parent: {
    post_date: string
    post_title: string
    post_excerpt: string
  }
}

/**
 * Convert Ketoliv JSON format to our RawRecipeData format
 */
export function convertKetolivToRawRecipeData(ketolivRecipes: KetolivRecipe[]): RawRecipeData[] {
  const fridaMatcher = new FridaDTUMatcher()
  
  return ketolivRecipes.map(recipe => {
    console.log(`🔄 Converting Ketoliv recipe: ${recipe.name}`)
    console.log(`   Original image_url: ${recipe.image_url}`)
    console.log(`   Original pin_image_url: ${recipe.pin_image_url}`)
    
    const parseAmount = (val: any): number => {
      if (typeof val === 'number') return isFinite(val) ? val : 0
      if (typeof val !== 'string') return 0
      const mapFractions: Record<string, string> = { '½': '0.5', '¼': '0.25', '¾': '0.75' }
      let s = val.trim()
      s = s.replace(/[½¼¾]/g, (m) => mapFractions[m] || m)
      s = s.replace(',', '.')
      // handle strings like "1/2"
      if (/^\s*\d+\s*\/\s*\d+\s*$/.test(s)) {
        const [n, d] = s.split('/').map(Number)
        return d ? n / d : 0
      }
      const num = parseFloat(s)
      return isFinite(num) ? num : 0
    }
    // Convert ingredients
    const ingredients = (recipe.ingredients_flat || [])
      .filter(ing => ing.type === 'ingredient')
      .map(ing => ({
        name: ing.name,
        amount: parseAmount(ing.amount),
        unit: ing.unit,
        notes: ing.notes || undefined
      }))

    // Convert instructions
    const instructions = (recipe.instructions_flat || [])
      .filter(inst => inst.type === 'instruction')
      .map((inst, index) => ({
        stepNumber: index + 1,
        instruction: inst.text.replace(/<[^>]*>/g, '').trim(), // Remove HTML tags
        time: undefined,
        tips: undefined
      }))

    // Determine main category from course tags
    const mainCategory = (recipe.tags.course && recipe.tags.course.length > 0) ? recipe.tags.course[0] : 'Hovedret'

    // Calculate total time
    const prepTime = parseInt(String(recipe.prep_time).replace(',', '.')) || 0
    const cookTime = parseInt(String(recipe.cook_time).replace(',', '.')) || 0
    const totalTime = prepTime + cookTime

    // Determine difficulty based on total time
    let difficulty: 'Nem' | 'Mellem' | 'Svær' = 'Nem'
    if (totalTime > 45) difficulty = 'Svær'
    else if (totalTime > 20) difficulty = 'Mellem'

    // Map dietary categories properly
    let dietaryCategories = recipe.tags.cuisine || []
    
    // Add keto if it's in the cuisine tags or if it's a keto recipe
    if (recipe.tags.cuisine?.includes('keto') || recipe.tags.cuisine?.includes('Keto')) {
      dietaryCategories = [...dietaryCategories, 'Keto']
    }
    
    // Add other common dietary categories
    if (recipe.tags.cuisine?.includes('paleo')) {
      dietaryCategories = [...dietaryCategories, 'Paleo']
    }
    if (recipe.tags.cuisine?.includes('lchf')) {
      dietaryCategories = [...dietaryCategories, 'LCHF']
    }

    return {
      title: recipe.name,
      description: recipe.summary.replace(/<[^>]*>/g, '').trim(), // Remove HTML tags
      shortDescription: recipe.parent.post_excerpt || recipe.name,
      preparationTime: prepTime,
      cookingTime: cookTime,
      totalTime: totalTime,
      // Nutrition will be calculated by import-processor.ts instead
      mainCategory,
      subCategories: recipe.tags.course || [],
      dietaryCategories,
      ingredients,
      instructions,
      imageUrl: recipe.image_url || '/images/recipe-placeholder.jpg',
      imageAlt: `${recipe.name} - Ketoliv`,
      servings: parseInt(recipe.servings) || 2,
      difficulty,
      author: 'Ketoliv',
      publishedAt: recipe.parent.post_date || new Date().toISOString(),
      rating: undefined,
      reviewCount: undefined
    }
  }).map(convertedRecipe => {
    console.log(`   ✅ Converted recipe: ${convertedRecipe.title}`)
    console.log(`   Final imageUrl: ${convertedRecipe.imageUrl}`)
    return convertedRecipe
  })
}

/**
 * Fetch image from Ketoliv if imageUrl is a Ketoliv URL
 */
async function fetchKetolivImage(imageUrl: string, title: string): Promise<{ imageUrl: string, imageAlt: string }> {
  try {
    // Check if it's a Ketoliv URL
    if (imageUrl.includes('ketoliv.dk') || imageUrl.includes('ketoliv')) {
      console.log(`🖼️ Fetching and storing image for: ${title}`)
      
      // Download and store image in Supabase Storage
      const result = await downloadAndStoreImage(imageUrl, title)
      
      if (result.success && result.storageUrl) {
        console.log(`✅ Successfully stored image for: ${title} in Supabase Storage`)
        return {
          imageUrl: result.storageUrl,
          imageAlt: title
        }
      } else {
        console.warn(`⚠️ Failed to store image for: ${title}, using fallback`)
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error fetching/storing image for ${title}:`, error)
  }
  
  // Return fallback image
  return {
    imageUrl: '/images/recipe-placeholder.jpg',
    imageAlt: `${title} - Functional Foods`
  }
}

export async function importRecipesWithImages(rawData: RawRecipeData[]): Promise<Recipe[]> {
  const recipes: Recipe[] = []
  
  for (const recipe of rawData) {
    // Use original ID if provided, otherwise leave empty for database service to assign
    const id = recipe.id || ''
    const slug = generateSlug(recipe.title)
    
    // Fetch image if it's from Ketoliv
    const { imageUrl, imageAlt } = await fetchKetolivImage(recipe.imageUrl, recipe.title)
    
    recipes.push({
      id,
      title: recipe.title,
      slug,
      description: recipe.description,
      shortDescription: recipe.shortDescription,
      preparationTime: recipe.preparationTime,
      cookingTime: recipe.cookingTime,
      totalTime: recipe.preparationTime + recipe.cookingTime,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
      metaTitle: `${recipe.title} - ${recipe.dietaryCategories?.[0] || 'Opskrift'} | Functional Foods`,
      metaDescription: generateMetaDescription(recipe),
      keywords: generateKeywords(recipe),
      mainCategory: recipe.mainCategory,
      subCategories: recipe.subCategories,
      dietaryCategories: recipe.dietaryCategories || [],
      ingredients: recipe.ingredients.map((ingredient, i) => ({
        id: `${id}-${i + 1}`,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        notes: ingredient.notes,
      })),
      instructions: recipe.instructions.map((step, i) => ({
        id: `${id}-${i + 1}`,
        stepNumber: step.stepNumber,
        instruction: step.instruction,
        time: step.time,
        tips: step.tips,
      })),
      imageUrl,
      imageAlt,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      author: recipe.author,
      publishedAt: new Date(recipe.publishedAt),
      updatedAt: new Date(recipe.publishedAt),
      rating: recipe.rating,
      reviewCount: recipe.reviewCount,
      prepTimeISO: `PT${recipe.preparationTime}M`,
      cookTimeISO: `PT${recipe.cookingTime}M`,
      totalTimeISO: `PT${recipe.preparationTime + recipe.cookingTime}M`,
    })
  }
  
  return recipes
}

export function importRecipes(rawData: RawRecipeData[]): Recipe[] {
  return rawData.map((recipe, index) => {
    // Use original ID if provided, otherwise leave empty for database service to assign
    const id = recipe.id || ''
    const slug = generateSlug(recipe.title)
    
    return {
      id,
      title: recipe.title,
      slug,
      description: recipe.description,
      shortDescription: recipe.shortDescription,
      preparationTime: recipe.preparationTime,
      cookingTime: recipe.cookingTime,
      totalTime: recipe.preparationTime + recipe.cookingTime,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
      metaTitle: `${recipe.title} - ${recipe.dietaryCategories?.[0] || 'Opskrift'} | Functional Foods`,
      metaDescription: generateMetaDescription(recipe),
      keywords: generateKeywords(recipe),
      mainCategory: recipe.mainCategory,
      subCategories: recipe.subCategories,
      dietaryCategories: recipe.dietaryCategories || [],
      ingredients: recipe.ingredients.map((ingredient, i) => ({
        id: `${id}-${i + 1}`,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        notes: ingredient.notes,
      })),
      instructions: recipe.instructions.map((step, i) => ({
        id: `${id}-${i + 1}`,
        stepNumber: step.stepNumber,
        instruction: step.instruction,
        time: step.time,
        tips: step.tips,
      })),
      imageUrl: recipe.imageUrl,
      imageAlt: recipe.imageAlt,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      author: recipe.author,
      publishedAt: new Date(recipe.publishedAt),
      updatedAt: new Date(recipe.publishedAt),
      rating: recipe.rating,
      reviewCount: recipe.reviewCount,
      prepTimeISO: `PT${recipe.preparationTime}M`,
      cookTimeISO: `PT${recipe.cookingTime}M`,
      totalTimeISO: `PT${recipe.preparationTime + recipe.cookingTime}M`,
    }
  })
}

/**
 * Batch import recipes with progress tracking and error handling
 * Processes recipes in small batches to avoid timeouts and provide better UX
 */
export interface BatchImportResult {
  success: boolean
  totalRecipes: number
  processedBatches: number
  successfulRecipes: number
  failedRecipes: number
  errors: Array<{
    recipeTitle: string
    error: string
    batchNumber: number
  }>
  progress: number // 0-100
}

export interface BatchImportOptions {
  batchSize?: number // Default: 5
  delayBetweenBatches?: number // Default: 1000ms
  onProgress?: (progress: number, currentBatch: number, totalBatches: number) => void
  onBatchComplete?: (batchNumber: number, successCount: number, errorCount: number) => void
}

export async function importRecipesInBatches(
  rawData: RawRecipeData[],
  options: BatchImportOptions = {}
): Promise<BatchImportResult> {
  const {
    batchSize = 5,
    delayBetweenBatches = 1000,
    onProgress,
    onBatchComplete
  } = options

  const totalRecipes = rawData.length
  const totalBatches = Math.ceil(totalRecipes / batchSize)
  
  console.log(`🚀 Starting batch import: ${totalRecipes} recipes in ${totalBatches} batches of ${batchSize}`)
  
  const result: BatchImportResult = {
    success: true,
    totalRecipes,
    processedBatches: 0,
    successfulRecipes: 0,
    failedRecipes: 0,
    errors: [],
    progress: 0
  }

  // Process each batch
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * batchSize
    const endIndex = Math.min(startIndex + batchSize, totalRecipes)
    const currentBatch = rawData.slice(startIndex, endIndex)
    const batchNumber = batchIndex + 1
    
    console.log(`📦 Processing batch ${batchNumber}/${totalBatches}: recipes ${startIndex + 1}-${endIndex}`)
    
    try {
      // Process current batch
      const batchRecipes = importRecipes(currentBatch)
      
      // Here you would typically save to database
      // For now, we'll simulate success
      const batchSuccessCount = batchRecipes.length
      const batchErrorCount = 0
      
      result.successfulRecipes += batchSuccessCount
      result.processedBatches = batchNumber
      
      // Update progress
      result.progress = Math.round((batchNumber / totalBatches) * 100)
      
      console.log(`✅ Batch ${batchNumber} complete: ${batchSuccessCount} successful, ${batchErrorCount} errors`)
      
      // Call progress callback
      if (onProgress) {
        onProgress(result.progress, batchNumber, totalBatches)
      }
      
      // Call batch complete callback
      if (onBatchComplete) {
        onBatchComplete(batchNumber, batchSuccessCount, batchErrorCount)
      }
      
      // Add delay between batches (except for the last batch)
      if (batchIndex < totalBatches - 1) {
        console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
      
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} failed:`, error)
      
      // Add errors for each recipe in the failed batch
      currentBatch.forEach(recipe => {
        result.errors.push({
          recipeTitle: recipe.title,
          error: error instanceof Error ? error.message : 'Unknown error',
          batchNumber
        })
      })
      
      result.failedRecipes += currentBatch.length
      result.success = false
    }
  }
  
  // Final result
  console.log(`🎯 Batch import complete!`)
  console.log(`   Total: ${result.totalRecipes} recipes`)
  console.log(`   Successful: ${result.successfulRecipes}`)
  console.log(`   Failed: ${result.failedRecipes}`)
  console.log(`   Batches: ${result.processedBatches}/${totalBatches}`)
  console.log(`   Progress: ${result.progress}%`)
  
  if (result.errors.length > 0) {
    console.log(`❌ Errors encountered:`, result.errors)
  }
  
  return result
}

/**
 * Smart batch import with automatic retry for failed recipes
 */
export async function importRecipesWithRetry(
  rawData: RawRecipeData[],
  options: BatchImportOptions & { maxRetries?: number } = {}
): Promise<BatchImportResult> {
  const { maxRetries = 2, ...batchOptions } = options
  
  console.log(`🔄 Starting import with retry (max ${maxRetries} attempts)`)
  
  // First attempt
  const result = await importRecipesInBatches(rawData, batchOptions)
  
  // Retry failed recipes if any
  for (let attempt = 1; attempt <= maxRetries && result.failedRecipes > 0; attempt++) {
    console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for ${result.failedRecipes} failed recipes`)
    
    // Get failed recipes
    const failedRecipes = rawData.filter(recipe => 
      result.errors.some(error => error.recipeTitle === recipe.title)
    )
    
    // Retry with failed recipes only
    const retryResult = await importRecipesInBatches(failedRecipes, {
      ...batchOptions,
      batchSize: Math.max(1, Math.floor((batchOptions.batchSize || 5) / 2)) // Smaller batches for retry
    })
    
    // Update main result
    result.successfulRecipes += retryResult.successfulRecipes
    result.failedRecipes = retryResult.failedRecipes
    result.errors = retryResult.errors
    result.progress = Math.min(100, result.progress + (retryResult.progress * 0.1)) // Small progress boost
    
    console.log(`🔄 Retry ${attempt} complete. Remaining failed: ${result.failedRecipes}`)
  }
  
  return result
}

function generateSlug(title: string): string {
  if (!title || title.trim() === '') {
    return `recipe-${Date.now()}` // Fallback for empty titles
  }
  
  const slug = title
    .toLowerCase()
    .replace(/[æøå]/g, (match) => {
      const replacements: { [key: string]: string } = {
        'æ': 'ae',
        'ø': 'oe',
        'å': 'aa'
      }
      return replacements[match]
    })
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  
  return slug || `recipe-${Date.now()}` // Fallback if result is empty
}

function generateMetaDescription(recipe: RawRecipeData): string {
  const dietary = recipe.dietaryCategories?.[0] || 'Opskrift'
  return `${recipe.shortDescription} ${dietary} opskrift til vægttab og en sund livsstil.`
}

function generateKeywords(recipe: RawRecipeData): string[] {
  const baseKeywords = [
    recipe.mainCategory.toLowerCase(),
    ...(recipe.dietaryCategories || []).map(cat => cat.toLowerCase()),
    'vægttab',
    'sunde opskrifter'
  ]
  
  // Add ingredient keywords
  const ingredientKeywords = (recipe.ingredients || [])
    .slice(0, 3)
    .map(ing => ing.name.toLowerCase())
  
  return [...baseKeywords, ...ingredientKeywords]
} 