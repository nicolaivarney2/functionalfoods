import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'

interface GenerateImageRequest {
  recipe: {
    title: string
    description: string
    ingredients: Array<{
      name: string
      amount: number
      unit: string
    }>
    dietaryCategories: string[]
  }
  category: string
}

export async function POST(request: NextRequest) {
  try {
    const { recipe, category }: GenerateImageRequest = await request.json()
    
    if (!recipe || !recipe.title) {
      return NextResponse.json(
        { success: false, error: 'Recipe title is required' },
        { status: 400 }
      )
    }

    console.log(`🎨 Generating precise image for recipe: ${recipe.title}`)

    // Create a precise prompt for Midjourney that matches brand
    const imagePrompt = createPreciseImagePrompt(recipe, category)
    
    // Call Make webhook for Midjourney
    const config = getOpenAIConfig()
    const makeWebhookUrl = config?.midjourneyWebhookUrl || process.env.MAKE_MIDJOURNEY_WEBHOOK_URL
    
    if (!makeWebhookUrl) {
      console.warn('Make webhook URL not configured, skipping image generation')
      return NextResponse.json({
        success: true,
        imageUrl: null,
        message: 'Image generation skipped - webhook not configured'
      })
    }

    const makeResponse = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipe: {
          title: recipe.title,
          description: recipe.description,
          category: category,
          dietaryCategories: recipe.dietaryCategories
        },
        imagePrompt: imagePrompt,
        timestamp: new Date().toISOString()
      })
    })

    if (!makeResponse.ok) {
      throw new Error(`Make webhook failed: ${makeResponse.status}`)
    }

    const makeData = await makeResponse.json()
    
    console.log(`✅ Image generation initiated: ${makeData.message || 'Success'}`)

    return NextResponse.json({
      success: true,
      imageUrl: makeData.imageUrl || null,
      message: makeData.message || 'Image generation initiated',
      prompt: imagePrompt
    })

  } catch (error) {
    console.error('Error generating recipe image:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate recipe image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createPreciseImagePrompt(recipe: any, category: string): string {
  // Check for custom prompt template
  const config = getOpenAIConfig()
  const customTemplate = config?.midjourneyPromptTemplate
  
  if (customTemplate) {
    // Use custom template with variable substitution
    return customTemplate
      .replace(/{title}/g, recipe.title)
      .replace(/{category}/g, category)
      .replace(/{ingredients}/g, recipe.ingredients.map((ing: any) => ing.name).join(', '))
      .replace(/{description}/g, recipe.description || '')
  }
  
  // Default system prompt for Functional Foods brand consistency
  let prompt = `Professional food photography for Functional Foods brand, ${recipe.title}, `
  
  // Add category-specific styling that matches brand
  switch (category) {
    case 'Familiemad':
      prompt += 'cozy family dinner setting, warm natural lighting, rustic wooden table, Danish home style, '
      break
    case 'Keto':
      prompt += 'modern healthy food presentation, clean white background, green vegetables prominent, healthy fats visible, minimalist style, '
      break
    case 'Sense':
      prompt += 'nutritious brain food, colorful fresh ingredients, scientific clean presentation, blue and green tones, '
      break
    case 'Paleo/LCHF':
      prompt += 'primal healthy food, natural earthy ingredients, wooden cutting board, organic feel, warm earth tones, '
      break
    case 'Antiinflammatorisk':
      prompt += 'healing foods, vibrant fresh colors, medicinal herbs visible, clean white background, green and yellow tones, '
      break
    case 'Fleksitarisk':
      prompt += 'plant-based with meat accent, balanced colorful composition, natural lighting, green and brown tones, '
      break
    case '5:2 Faste':
      prompt += 'light healthy meal, portion control visible, clean presentation, white and light blue tones, '
      break
    case 'Meal Prep (3 dage)':
      prompt += 'meal prep containers, organized fresh food, clean kitchen setting, blue and white tones, '
      break
    default:
      prompt += 'delicious appetizing food, clean presentation, '
  }

  // Add main ingredients to the prompt
  const mainIngredients = recipe.ingredients.slice(0, 3).map((ing: any) => ing.name).join(', ')
  prompt += `featuring ${mainIngredients}, `

  // Add Functional Foods brand specifications
  prompt += 'high resolution, studio lighting, appetizing, food styling, Danish cuisine style, '
  prompt += 'shot with professional camera, shallow depth of field, commercial food photography, '
  prompt += 'clean background, natural colors, appetizing presentation, '
  prompt += 'brand consistent with Functional Foods aesthetic'

  return prompt
}

