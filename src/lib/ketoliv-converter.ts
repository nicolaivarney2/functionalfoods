import { RawRecipeData } from './recipe-import'

interface KetolivRecipe {
  id: number
  slug: string
  name: string
  summary: string
  author_name: string
  servings: string
  prep_time: string
  cook_time: string
  total_time: string
  image_url: string
  ingredients_flat: Array<{
    name: string
    amount: string
    unit: string
    notes: string
    type: string
  }>
  instructions_flat: Array<{
    name: string
    text: string
    type: string
  }>
  tags: {
    course: string[]
    cuisine: string[]
    keyword: string[]
  }
  nutrition: {
    calories: number
    carbohydrates: number
    protein: number
    fat: number
    fiber: number
  }
  // Page counter fields (if available in Ketoliv JSON)
  page_views?: number
  post_views?: number
  view_count?: number
  popularity?: number
}

export function convertKetolivRecipes(ketolivData: KetolivRecipe[]): RawRecipeData[] {
  console.log(`🔄 Converting ${ketolivData.length} Ketoliv recipes...`)
  
  return ketolivData.map(recipe => {
    console.log(`   📝 Converting recipe: ${recipe.name}`)
    console.log(`   Original image_url: ${recipe.image_url}`)
    
    // Extract dietary categories from tags
    const dietaryCategories = extractDietaryCategories(recipe.tags?.cuisine || [])
    
    // Convert ingredients - handle both flat and nested structures
    const ingredients = (recipe.ingredients_flat || [])
      .filter(ing => ing.type === 'ingredient')
      .map(ing => ({
        name: ing.name || '',
        amount: parseFloat((ing.amount || '0').replace(',', '.')) || 0,
        unit: ing.unit || '',
        notes: ing.notes || ''
      }))

    // Convert instructions - handle both flat and nested structures
    const instructions = (recipe.instructions_flat || [])
      .filter(inst => inst.type === 'instruction')
      .map((inst, index) => ({
        stepNumber: index + 1,
        instruction: (inst.text || '').replace(/<\/?p>/g, '').trim(),
        time: undefined,
        tips: undefined
      }))

    // Determine main category with normalization to allowed categories
    const normalizeMainCategory = (courseTag: string, description: string, title: string = ''): string => {
      const tagLower = (courseTag || '').toLowerCase()
      const descLower = (description || '').toLowerCase()
      const titleLower = (title || '').toLowerCase()
      const allText = `${titleLower} ${descLower} ${tagLower}`
      
      // Allowed categories from Ketoliv
      const allowedCategories = [
        'Aftensmad', 'Verden rundt', 'Frokost', 'Is og sommer', 'Salater',
        'Fisk', 'Morgenmad', 'God til to dage', 'Vegetar', 'Tilbehør',
        'Bagværk', 'Madpakke opskrifter', 'Desserter', 'Fatbombs',
        'Food prep', 'Simre retter', 'Dip og dressinger'
      ]
      
      // Check for specific category keywords (most specific first)
      if (allText.includes('madpakke')) return 'Madpakke opskrifter'
      if (allText.includes('salat') || allText.includes('salater')) return 'Salater'
      if (allText.includes('fisk') || allText.includes('laks') || allText.includes('tun')) return 'Fisk'
      if (allText.includes('is') || allText.includes('sommer')) return 'Is og sommer'
      if (allText.includes('dessert') || allText.includes('desserter')) return 'Desserter'
      if (allText.includes('bagværk') || allText.includes('brød') || allText.includes('kage')) return 'Bagværk'
      if (allText.includes('vegetar')) return 'Vegetar'
      if (allText.includes('fatbomb')) return 'Fatbombs'
      if (allText.includes('food prep') || allText.includes('meal prep')) return 'Food prep'
      if (allText.includes('simre')) return 'Simre retter'
      if (allText.includes('dip') || allText.includes('dressing')) return 'Dip og dressinger'
      if (allText.includes('tilbehør')) return 'Tilbehør'
      if (allText.includes('verden rundt') || allText.includes('international')) return 'Verden rundt'
      if (allText.includes('god til to dage') || allText.includes('batch')) return 'God til to dage'
      
      // Meal type keywords
      if (allText.includes('frokost') || allText.includes('lunch') || allText.includes('til frokost')) {
        return 'Frokost'
      }
      if (allText.includes('morgenmad') || allText.includes('breakfast') || allText.includes('til morgenmad')) {
        return 'Morgenmad'
      }
      if (allText.includes('aftensmad') || allText.includes('dinner') || allText.includes('middag') || allText.includes('hovedret')) {
        return 'Aftensmad'
      }
      
      // Default fallback
      return 'Aftensmad'
    }
    
    const rawCourseTag = recipe.tags?.course?.[0] || ''
    const mainCategory = normalizeMainCategory(rawCourseTag, recipe.summary || '', recipe.name || '')

    // Generate slug
    const slug = (recipe.slug || '').replace('wprm-', '').replace(/-til$/, '')

    return {
      title: recipe.name || 'Untitled Recipe',
      description: (recipe.summary || '').replace(/<\/?p>/g, '').trim(),
      shortDescription: (recipe.summary || '').replace(/<\/?p>/g, '').substring(0, 150) + '...',
      preparationTime: parseInt(recipe.prep_time || '0') || 0,
      cookingTime: parseInt(recipe.cook_time || '0') || 0,
      calories: recipe.nutrition?.calories,
      protein: recipe.nutrition?.protein,
      carbs: recipe.nutrition?.carbohydrates,
      fat: recipe.nutrition?.fat,
      fiber: recipe.nutrition?.fiber,
      mainCategory,
      subCategories: recipe.tags?.course || [],
      dietaryCategories,
      ingredients,
      instructions,
      imageUrl: (recipe.image_url || '').replace(/\\/g, ''),
      imageAlt: recipe.name || 'Recipe image',
      servings: parseInt(recipe.servings || '2') || 2,
      difficulty: determineDifficulty(parseInt(recipe.total_time || '0') || 0),
      author: recipe.author_name || 'Functional Foods',
      publishedAt: new Date().toISOString(),
      rating: undefined,
      reviewCount: undefined,
      // Page counter mapping
      ketolivViews: recipe.page_views || recipe.post_views || recipe.view_count || recipe.popularity || 0
    }
  }).map(convertedRecipe => {
    console.log(`   ✅ Converted recipe: ${convertedRecipe.title}`)
    console.log(`   Final imageUrl: ${convertedRecipe.imageUrl}`)
    return convertedRecipe
  })
}

function extractDietaryCategories(cuisineTags: string[]): string[] {
  const categories: string[] = []
  
  cuisineTags.forEach(tag => {
    if (tag.includes('[Keto]')) categories.push('Keto')
    if (tag.includes('[LCHF]')) categories.push('LCHF')
    if (tag.includes('[Paleo]')) categories.push('Paleo')
    if (tag.includes('[Vegetarisk]')) categories.push('Vegetarian')
    if (tag.includes('[Vegan]')) categories.push('Vegan')
    if (tag.includes('[Glutenfri]')) categories.push('Gluten-Free')
    if (tag.includes('[SENSE]')) categories.push('SENSE')
  })
  
  return categories.length > 0 ? categories : ['Keto'] // Default to Keto if no specific category
}

function determineDifficulty(totalTime: number): 'Nem' | 'Mellem' | 'Svær' {
  if (totalTime <= 30) return 'Nem'
  if (totalTime <= 60) return 'Mellem'
  return 'Svær'
}

export function downloadKetolivData(): Promise<KetolivRecipe[]> {
  return fetch('https://ketoliv.dk/wp-content/uploads/wprm/WPRM%20Recipe%20Export.json')
    .then(response => response.json())
    .then(data => {
      console.log(`Downloaded ${data.length} recipes from ketoliv.dk`)
      return data
    })
    .catch(error => {
      console.error('Error downloading ketoliv data:', error)
      return []
    })
} 