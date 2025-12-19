import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Use the same endpoint as single-tip generation to ensure identical behavior
async function generateTipsForRecipe(recipe: any): Promise<string | null> {
  try {
    // Call the same API endpoint that single-tip generation uses
    // In server-side context, use localhost or environment variable
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/ai/generate-tips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: recipe.title,
        description: recipe.description || 'En lækker opskrift der er værd at prøve',
        difficulty: recipe.difficulty || 'Mellem',
        totalTime: (recipe.preparationTime || 0) + (recipe.cookingTime || 0),
        dietaryCategories: Array.isArray(recipe.dietaryCategories) 
          ? recipe.dietaryCategories 
          : ['Generel']
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate tips')
    }

    const data = await response.json()
    return data.tips || null
  } catch (error) {
    console.error(`Error generating tips for ${recipe.title}:`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting bulk AI tips generation for draft recipes...')

    // Check OpenAI config first
    const openaiConfig = getOpenAIConfig()
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
    
    if (!openaiConfig || !openaiConfig.apiKey) {
      const errorMsg = isProduction
        ? 'OpenAI API key mangler i production. Tilføj OPENAI_API_KEY environment variable i Vercel dashboard.'
        : 'OpenAI API key mangler. Tilføj den i /admin/settings'
      
      return NextResponse.json({ 
        error: errorMsg,
        details: 'API key er påkrævet for at generere AI tips'
      }, { status: 500 })
    }

    // Validate API key format (should start with sk-)
    if (!openaiConfig.apiKey.startsWith('sk-')) {
      return NextResponse.json({ 
        error: 'Ugyldig OpenAI API key format. API key skal starte med "sk-"',
        details: 'Tjek at API key\'en er korrekt i Vercel environment variables eller /admin/settings'
      }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) { return undefined },
        set(name: string, value: string, options: any) {},
        remove(name: string, options: any) {},
      },
    })

    // Fetch all draft recipes
    const { data: allDraftRecipes, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, description, difficulty, preparationTime, cookingTime, dietaryCategories, personalTips')
      .eq('status', 'draft')

    if (fetchError) {
      console.error('❌ Error fetching draft recipes:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch draft recipes' }, { status: 500 })
    }

    // Filter out recipes that already have tips
    const draftRecipes = (allDraftRecipes || []).filter(recipe => 
      !recipe.personalTips || recipe.personalTips.trim() === ''
    )

    if (!draftRecipes || draftRecipes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Ingen kladder uden tips fundet',
        processed: 0,
        total: 0,
        successful: 0,
        failed: 0
      })
    }

    console.log(`📋 Found ${draftRecipes.length} draft recipes without tips`)
    const recipesNeedingTips = draftRecipes
    console.log(`🎯 Processing ${recipesNeedingTips.length} recipes that need tips`)

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process recipes one by one with delay to avoid rate limiting
    for (let i = 0; i < recipesNeedingTips.length; i++) {
      const recipe = recipesNeedingTips[i]
      console.log(`\n[${i + 1}/${recipesNeedingTips.length}] Processing: ${recipe.title}`)

      try {
        // Generate tips
        const tips = await generateTipsForRecipe(recipe)

        if (tips) {
          // Save tips to database
          const { error: updateError } = await supabase
            .from('recipes')
            .update({
              personalTips: tips,
              updatedAt: new Date().toISOString()
            })
            .eq('id', recipe.id)

          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`)
          }

          results.successful++
          console.log(`✅ Tips generated and saved for: ${recipe.title}`)
        } else {
          results.failed++
          results.errors.push(`${recipe.title}: Failed to generate tips`)
          console.log(`⚠️ Failed to generate tips for: ${recipe.title}`)
        }

        results.processed++

        // Add delay between requests to avoid rate limiting (except for last one)
        if (i < recipesNeedingTips.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        }

      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`${recipe.title}: ${errorMsg}`)
        console.error(`❌ Error processing ${recipe.title}:`, error)
      }
    }

    console.log(`\n✅ Bulk tips generation complete!`)
    console.log(`   Processed: ${results.processed}`)
    console.log(`   Successful: ${results.successful}`)
    console.log(`   Failed: ${results.failed}`)

    return NextResponse.json({
      success: true,
      message: `Genererede tips for ${results.successful} af ${results.processed} opskrifter`,
      processed: results.processed,
      total: recipesNeedingTips.length,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors.slice(0, 10) : undefined // Only return first 10 errors
    })

  } catch (error) {
    console.error('❌ Error in bulk-generate-tips:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate tips', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
