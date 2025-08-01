import { Recipe, Ingredient, RecipeStep } from '@/types/recipe'

export interface RawRecipeData {
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

export function importRecipes(rawData: RawRecipeData[]): Recipe[] {
  return rawData.map((recipe, index) => {
    const id = (index + 1).toString()
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