import { NextRequest, NextResponse } from 'next/server'

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

    console.log(`🎨 Generating image for recipe: ${recipe.title}`)

    // Create a descriptive prompt for Midjourney
    const imagePrompt = createImagePrompt(recipe, category)
    
    // Call Make webhook for Midjourney
    const makeWebhookUrl = process.env.MAKE_MIDJOURNEY_WEBHOOK_URL
    
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

function createImagePrompt(recipe: any, category: string): string {
  // Base prompt for food photography
  let prompt = `Professional food photography, ${recipe.title}, `
  
  // Add category-specific styling
  switch (category) {
    case 'Familiemad':
      prompt += 'cozy family dinner, warm lighting, rustic table setting, '
      break
    case 'Keto':
      prompt += 'modern healthy food, clean presentation, green vegetables, healthy fats, '
      break
    case 'Sense':
      prompt += 'nutritious brain food, colorful ingredients, scientific presentation, '
      break
    case 'Paleo/LCHF':
      prompt += 'primal healthy food, natural ingredients, earthy tones, '
      break
    case 'Antiinflammatorisk':
      prompt += 'healing foods, vibrant colors, fresh ingredients, medicinal herbs, '
      break
    case 'Fleksitarisk':
      prompt += 'plant-based with meat, balanced composition, natural colors, '
      break
    case '5:2 Faste':
      prompt += 'light healthy meal, portion control, clean presentation, '
      break
    case 'Meal Prep (3 dage)':
      prompt += 'meal prep containers, organized food, fresh ingredients, '
      break
    default:
      prompt += 'delicious food, appetizing presentation, '
  }

  // Add main ingredients to the prompt
  const mainIngredients = recipe.ingredients.slice(0, 3).map((ing: any) => ing.name).join(', ')
  prompt += `featuring ${mainIngredients}, `

  // Add photography style
  prompt += 'high resolution, studio lighting, appetizing, food styling, Danish cuisine style, '
  
  // Add technical specifications
  prompt += 'shot with professional camera, shallow depth of field, commercial food photography'

  return prompt
}
