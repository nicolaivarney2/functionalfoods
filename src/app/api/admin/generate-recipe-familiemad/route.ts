import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'

interface ExistingRecipe {
  id: string
  title: string
  description: string
  dietaryCategories?: string[]
}

interface GenerateRecipeRequest {
  categoryName: string
  existingRecipes: ExistingRecipe[]
}

export async function POST(request: NextRequest) {
  try {
    const { categoryName, existingRecipes }: GenerateRecipeRequest = await request.json()
    
    if (!categoryName) {
      return NextResponse.json(
        { success: false, error: 'categoryName is required' },
        { status: 400 }
      )
    }

    console.log(`👨‍👩‍👧‍👦 Generating Familiemad recipe: ${categoryName}`)

    // Get OpenAI config from existing system
    const openaiConfig = getOpenAIConfig()
    
    if (!openaiConfig || !openaiConfig.apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured',
          details: 'Please configure OpenAI API key in admin settings'
        },
        { status: 500 }
      )
    }

    if (!openaiConfig.assistantIds?.familiemad) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Familiemad Assistant ID not configured',
          details: 'Please configure Familiemad Assistant ID in admin settings'
        },
        { status: 500 }
      )
    }

    // Get existing recipe titles to avoid duplicates
    const existingTitles = existingRecipes.map(r => r.title.toLowerCase())
    
    console.log('🔍 OpenAI Config:', {
      apiKey: openaiConfig.apiKey ? 'Set' : 'Not set',
      familiemadAssistant: openaiConfig.assistantIds?.familiemad || 'Not set'
    })
    
    if (!openaiConfig.assistantIds?.familiemad) {
      throw new Error('Familiemad Assistant ID not configured')
    }
    
    // Generate recipe using Assistant API
    const response = await fetch(`https://api.openai.com/v1/assistants/${openaiConfig.assistantIds.familiemad}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        additional_instructions: `Generer en ny Familiemad opskrift der er unik og ikke ligner eksisterende opskrifter: ${existingTitles.join(', ')}. 

Returnér kun valid JSON i det nøjagtige format herunder. Ingen ekstra tekst, ingen markdown.
Brug HTML i felterne summary, instructions_flat[].text og notes (enkle <p> eller <ul>/<ol> er nok).

Enheder: Brug gram, ml, tsk, spsk, stk.
Alle ingredienser i ingredients_flat skal have name, type, amount, unit, og notes (tom streng hvis ikke relevant).
Brug grupper i både ingredienser og instruktioner, når det giver mening (fx "Kød", "Sauce", "Topping").

JSON-struktur (obligatorisk):
{
  "name": "string (opskriftens titel)",
  "summary": "string (HTML formateret beskrivelse)",
  "servings": "string (antal portioner)",
  "prep_time": "string (forberedelsestid i minutter)",
  "cook_time": "string (tilberedningstid i minutter)", 
  "total_time": "string (total tid i minutter)",
  "tags": {
    "course": ["string array (f.eks. 'Aftensmad')"],
    "cuisine": ["string array (f.eks. 'Familiemad')"]
  },
  "ingredients_flat": [
    {
      "name": "string (ingrediens navn eller gruppe navn)",
      "type": "string ('ingredient' eller 'group')",
      "amount": "string (mængde, kun for ingredienser)",
      "unit": "string (enhed, kun for ingredienser)", 
      "notes": "string (noter, kun for ingredienser)"
    }
  ],
  "instructions_flat": [
    {
      "name": "string (instruktion gruppe navn eller tom)",
      "text": "string (HTML formateret instruktion)",
      "type": "string ('instruction' eller 'group')"
    }
  ],
  "notes": "string (HTML formateret noter)"
}`,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const runData = await response.json()
    
    // Wait for the assistant run to complete
    let runStatus = runData.status
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max wait
    
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out')
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      
      const statusResponse = await fetch(`https://api.openai.com/v1/assistants/${openaiConfig.assistantIds.familiemad}/runs/${runData.id}`, {
        headers: {
          'Authorization': `Bearer ${openaiConfig.apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })
      
      const statusData = await statusResponse.json()
      runStatus = statusData.status
      attempts++
    }
    
    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`)
    }
    
    // Get the messages from the thread
    const messagesResponse = await fetch(`https://api.openai.com/v1/assistants/${openaiConfig.assistantIds.familiemad}/threads/${runData.thread_id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })
    
    const messagesData = await messagesResponse.json()
    const recipeContent = messagesData.data[0]?.content[0]?.text?.value
    
    if (!recipeContent) {
      throw new Error('No recipe content generated')
    }

    // Parse the generated recipe
    const recipe = parseGeneratedRecipe(recipeContent, 'familiemad')
    
    console.log(`✅ Generated Familiemad recipe: ${recipe.title}`)

    return NextResponse.json({
      success: true,
      recipe
    })

  } catch (error) {
    console.error('Error generating Familiemad recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Familiemad recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


function parseGeneratedRecipe(content: string, category: string): any {
  try {
    // Try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in generated content')
    }

    const recipe = JSON.parse(jsonMatch[0])
    
    // Handle new format with ingredients_flat and instructions_flat
    if (recipe.ingredients_flat && recipe.instructions_flat) {
      // Convert from new format to old format for validation
      const ingredients = recipe.ingredients_flat
        .filter((item: any) => item.type === 'ingredient')
        .map((item: any) => ({
          name: item.name,
          amount: parseFloat(item.amount) || 0,
          unit: item.unit || '',
          notes: item.notes || ''
        }))
      
      const instructions = recipe.instructions_flat
        .filter((item: any) => item.type === 'instruction')
        .map((item: any, index: number) => ({
          stepNumber: index + 1,
          instruction: item.text.replace(/<[^>]*>/g, ''), // Remove HTML tags
          time: 0,
          tips: ''
        }))
      
      return {
        title: recipe.name,
        description: recipe.summary ? recipe.summary.replace(/<[^>]*>/g, '') : '',
        ingredients: ingredients,
        instructions: instructions,
        servings: parseInt(recipe.servings) || 4,
        prepTime: parseInt(recipe.prep_time) || 15,
        cookTime: parseInt(recipe.cook_time) || 30,
        difficulty: 'Easy',
        dietaryCategories: ['familiemad'],
        nutritionalInfo: {
          calories: 400,
          protein: 25,
          carbs: 45,
          fat: 18,
          fiber: 6
        }
      }
    }
    
    // Handle old format
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Missing required recipe fields')
    }

    // Add category-specific dietary categories
    recipe.dietaryCategories = ['familiemad']
    
    // Ensure all required fields exist
    return {
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: recipe.servings || 4,
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      difficulty: recipe.difficulty || 'Easy',
      dietaryCategories: recipe.dietaryCategories || ['familiemad'],
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 400,
        protein: 25,
        carbs: 45,
        fat: 18,
        fiber: 6
      }
    }
  } catch (error) {
    console.error('Error parsing generated Familiemad recipe:', error)
    console.error('Content:', content.substring(0, 500))
    throw new Error('Failed to parse generated recipe')
  }
}

