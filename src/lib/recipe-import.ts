import { Recipe, Ingredient, RecipeStep } from '@/types/recipe'
import { FridaDTUMatcher } from './frida-dtu-matcher'

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
    // Convert ingredients
    const ingredients = recipe.ingredients_flat
      .filter(ing => ing.type === 'ingredient')
      .map(ing => ({
        name: ing.name,
        amount: parseFloat(ing.amount) || 0,
        unit: ing.unit,
        notes: ing.notes || undefined
      }))

    // Convert instructions
    const instructions = recipe.instructions_flat
      .filter(inst => inst.type === 'instruction')
      .map((inst, index) => ({
        stepNumber: index + 1,
        instruction: inst.text.replace(/<[^>]*>/g, '').trim(), // Remove HTML tags
        time: undefined,
        tips: undefined
      }))

    // Determine main category from course tags
    const mainCategory = recipe.tags.course?.[0] || 'Hovedret'

    // Calculate total time
    const prepTime = parseInt(recipe.prep_time) || 0
    const cookTime = parseInt(recipe.cook_time) || 0
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
      // Calculate nutrition using Frida DTU data
      ...(() => {
        const fridaNutrition = fridaMatcher.calculateRecipeNutrition(ingredients)
        return {
          calories: Math.round(fridaNutrition.calories),
          protein: Math.round(fridaNutrition.protein * 10) / 10,
          carbs: Math.round(fridaNutrition.carbs * 10) / 10,
          fat: Math.round(fridaNutrition.fat * 10) / 10,
          fiber: Math.round(fridaNutrition.fiber * 10) / 10,
        }
      })(),
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
  })
}

/**
 * Fetch image from Ketoliv if imageUrl is a Ketoliv URL
 */
async function fetchKetolivImage(imageUrl: string, title: string): Promise<{ imageUrl: string, imageAlt: string }> {
  try {
    // Check if it's a Ketoliv URL
    if (imageUrl.includes('ketoliv.dk') || imageUrl.includes('ketoliv')) {
      console.log(`🖼️ Fetching image for: ${title}`)
      
      // Try to fetch the image
      const response = await fetch(imageUrl)
      if (response.ok) {
        console.log(`✅ Successfully fetched image for: ${title}`)
        return {
          imageUrl,
          imageAlt: title
        }
      } else {
        console.warn(`⚠️ Failed to fetch image for: ${title}, using fallback`)
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error fetching image for ${title}:`, error)
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
      metaTitle: `${recipe.title} - ${recipe.dietaryCategories[0]} opskrift | Functional Foods`,
      metaDescription: generateMetaDescription(recipe),
      keywords: generateKeywords(recipe),
      mainCategory: recipe.mainCategory,
      subCategories: recipe.subCategories,
      dietaryCategories: recipe.dietaryCategories,
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
      metaTitle: `${recipe.title} - ${recipe.dietaryCategories[0]} opskrift | Functional Foods`,
      metaDescription: generateMetaDescription(recipe),
      keywords: generateKeywords(recipe),
      mainCategory: recipe.mainCategory,
      subCategories: recipe.subCategories,
      dietaryCategories: recipe.dietaryCategories,
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

function generateSlug(title: string): string {
  return title
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
}

function generateMetaDescription(recipe: RawRecipeData): string {
  const dietary = recipe.dietaryCategories[0]
  return `${recipe.shortDescription} ${dietary} opskrift til vægttab og en sund livsstil.`
}

function generateKeywords(recipe: RawRecipeData): string[] {
  const baseKeywords = [
    recipe.mainCategory.toLowerCase(),
    ...recipe.dietaryCategories.map(cat => cat.toLowerCase()),
    'vægttab',
    'sunde opskrifter'
  ]
  
  // Add ingredient keywords
  const ingredientKeywords = recipe.ingredients
    .slice(0, 3)
    .map(ing => ing.name.toLowerCase())
  
  return [...baseKeywords, ...ingredientKeywords]
} 