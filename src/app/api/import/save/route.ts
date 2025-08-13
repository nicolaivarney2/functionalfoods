import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { downloadBulkImages } from '@/lib/image-downloader'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipes, ingredients, requireIngredients } = body || {}

    if (!Array.isArray(recipes)) {
      return NextResponse.json({ success: false, message: 'recipes must be an array' }, { status: 400 })
    }

    // Ensure images are local
    const recipesWithLocalImages = await downloadBulkImages(recipes)

    // Ensure each recipe has an ID to satisfy DB constraints
    const withIds = recipesWithLocalImages.map((r: any, idx: number) => ({
      ...r,
      id: r.id && String(r.id).trim() !== '' ? String(r.id) : `${Date.now()}-${idx}`
    }))

    // Map to DB columns (mirror of main import route)
    const mapRecipe = (recipe: any) => {
      const row: any = {
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
        author: recipe.author || 'Functional Foods',
      }
      if (recipe.slug) row.slug = recipe.slug
      row.shortdescription = recipe.shortDescription || null
      row.preparationtime = recipe.preparationTime || 0
      row.cookingtime = recipe.cookingTime || 0
      row.totaltime = recipe.totalTime || ((recipe.preparationTime || 0) + (recipe.cookingTime || 0))
      row.metatitle = recipe.metaTitle || null
      row.metadescription = recipe.metaDescription || null
      row.maincategory = recipe.mainCategory || null
      row.subcategories = recipe.subCategories || null
      row.dietarycategories = recipe.dietaryCategories && recipe.dietaryCategories.length > 0 ? recipe.dietaryCategories : null
      row.imageurl = recipe.imageUrl || '/images/recipe-placeholder.jpg'
      row.imagealt = recipe.imageAlt || null
      row.publishedat = recipe.publishedAt ? (typeof recipe.publishedAt === 'string' ? recipe.publishedAt : recipe.publishedAt.toISOString()) : new Date().toISOString()
      row.updatedat = recipe.updatedAt ? (typeof recipe.updatedAt === 'string' ? recipe.updatedAt : recipe.updatedAt.toISOString()) : new Date().toISOString()
      row.rating = recipe.rating || null
      row.reviewcount = recipe.reviewCount || null
      row.preptimeiso = recipe.prepTimeISO || null
      row.cooktimeiso = recipe.cookTimeISO || null
      row.totaltimeiso = recipe.totalTimeISO || null
      if (recipe.nutritionalInfo) row.nutritionalinfo = recipe.nutritionalInfo
      return row
    }

    // Batch upsert recipes to avoid large payloads
    const batchSize = parseInt(process.env.IMPORT_RECIPE_BATCH_SIZE || '5', 10)
    let savedCount = 0
    for (let i = 0; i < withIds.length; i += batchSize) {
      const slice = withIds.slice(i, i + batchSize)
      const filteredRecipes = slice.map(mapRecipe)
      const { error: saveRecipesError } = await supabaseServer
        .from('recipes')
        .upsert(filteredRecipes, { onConflict: 'id' })
      if (saveRecipesError) {
        return NextResponse.json({ success: false, message: 'Failed to save recipes', error: saveRecipesError.message, details: saveRecipesError.details, hint: saveRecipesError.hint, code: saveRecipesError.code }, { status: 500 })
      }
      savedCount += filteredRecipes.length
    }

    let ingredientSaveWarning: string | null = null
    let failedIngredientIds: string[] = []
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      // Normalize ingredients to match DB columns
      const toSlug = (input: string) => (input || '')
        .toLowerCase()
        .replace(/[æøå]/g, (m) => ({ 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }[m] as string))
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      // Normalize + dedupe by id (first occurrence wins)
      const normalized = ingredients.map((ing: any, idx: number) => {
        const id = (ing?.id && String(ing.id).trim() !== '') ? String(ing.id) : toSlug(ing?.name || `ing-${Date.now()}-${idx}`)
        return {
          id,
          name: ing?.name || 'Ukendt',
          category: ing?.category || 'general',
          description: ing?.description || `${ing?.name || id} - imported`
        }
      })
      const dedupMap = new Map<string, any>()
      for (const ing of normalized) {
        if (!dedupMap.has(ing.id)) dedupMap.set(ing.id, ing)
      }
      const filteredIngredients = Array.from(dedupMap.values())

      // Skip already existing ingredients in DB
      const ids = filteredIngredients.map(i => i.id)
      const { data: existingRows, error: existingErr } = await supabaseServer
        .from('ingredients')
        .select('id')
        .in('id', ids)
      if (existingErr) {
        console.error('⚠️ Ingredient existence check failed:', existingErr)
      }
      const existingIds = new Set((existingRows || []).map(r => r.id))
      const toInsert = filteredIngredients.filter(i => !existingIds.has(i.id))

      // Batch insert to avoid payload/duplicate-in-batch issues
      const chunk = <T,>(arr: T[], size: number) => {
        const out: T[][] = []
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
        return out
      }
      let inserted = 0
      for (const part of chunk(toInsert, 200)) {
        const { error: saveIngredientsError } = await supabaseServer
          .from('ingredients')
          .insert(part)
        if (saveIngredientsError) {
          console.error('⚠️ Ingredient save error (batch):', saveIngredientsError)
          ingredientSaveWarning = `Ingredients not saved: ${saveIngredientsError.message}`
          failedIngredientIds = part.map((i:any)=>i.id)
          if (requireIngredients !== false) {
            return NextResponse.json({ success: false, message: 'Failed to save ingredients', error: saveIngredientsError.message, failedIngredientIds }, { status: 500 })
          }
        } else {
          inserted += part.length
        }
      }
      // Overwrite ingredientCount to reflect actually attempted/inserted new rows
      (body as any)._ingredientStats = { requested: ingredients.length, normalized: normalized.length, deduped: filteredIngredients.length, existing: existingIds.size, inserted }
    }

    return NextResponse.json({ success: true, message: 'Saved with images', recipeCount: filteredRecipes.length, ingredientCount: Array.isArray(ingredients) ? ingredients.length : 0, warning: ingredientSaveWarning, failedIngredientIds })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Unknown error' }, { status: 500 })
  }
}


