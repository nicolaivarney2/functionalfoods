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
    
    // Generate recipe using standard OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Du er FunctionalFoods opskriftsassistent for Familiemad. Skriv altid på dansk.

Formål: Generér familievenlige opskrifter, der passer til danske hjem. FOKUSÉR PÅ RETTER SOM BØRN VIL SPISE - ikke voksenmad.

KLASSISKE DANSKE FAMILIERETTER:
- Frikadeller med kartofler og brun sovs
- Pasta bolognese
- Kylling i karry med ris
- Fiskefilet med kartofler og remoulade
- Hakkebøf med løg og kartofler
- Pasta med kødsovs
- Ovnbagt kylling med grøntsager
- Pølse med kartofler
- Frikadeller med kartoffelmos
- Kylling med kartofler og grøntsager

UNDGÅ:
- Krydede retter (chili, stærke krydderier)
- Eksotiske ingredienser
- Voksenmad (oksepølser, krydret bønnesalat)
- Retter med stærke smage

INGREDIENS FORMATERING - VIGTIGT:
- Brug små bogstaver (ikke forbogstav stort)
- Hvidløg: "1 stk hvidløgsfed" (IKKE "2 fed hvidløg" eller "1 stk hvidløg")
- Persille: "0,25 bundt persille" (IKKE "1 håndfuld persille" eller "1 bundt persille")
- Purløg: "1 stk purløg" med "fintsnittet" i notes feltet (IKKE "fintsnittet purløg")
- Andre krydderurter: "0,5 bundt timian", "0,25 bundt rosmarin"
- Kartofler: "500 g kartofler" (ikke "4 stk kartofler" eller "4 kartofler")
- Kød: "500 g hakket oksekød", "200 g kyllingebryst"
- Grøntsager: "2 stk gulerødder", "1 stk løg", "200 g broccoli"
- UNDGÅ duplikationer: Skriv kun "1 stk hvidløgsfed" ikke "1 stk hvidløgsfed" og "1 stk hvidløg"

MAD SKAL VÆRE:
- Enkel, budgetvenlig og praktisk
- Brug almindelige ingredienser der er lette at få fat i
- Retter som børn vil spise
- ALTID 2 portioner (servings: "2")

TITEL REGLER:
- Varier titlerne - ikke altid "børnevenlig" eller "børnevenlige"
- Brug beskrivende titler: "Kylling med kartofler", "Pasta bolognese", "Frikadeller med brun sovs"
- Kun brug "børnevenlig" når det er relevant for retten

Returnér kun valid JSON i det nøjagtige format. VIKTIGT: amount skal være et positivt tal - IKKE tom eller 0.`
          },
          {
            role: "user",
            content: `Generer en ny Familiemad opskrift der er unik og ikke ligner eksisterende opskrifter.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.map(title => `- ${title}`).join('\n')}

INGREDIENS FORMATERING - FØLG DISSE REGLER:
- Brug små bogstaver (ikke forbogstav stort)
- Hvidløg: "1 stk hvidløgsfed" (IKKE "2 fed hvidløg" eller "1 stk hvidløg")
- Persille: "0,25 bundt persille" (IKKE "1 håndfuld persille" eller "1 bundt persille")
- Purløg: "1 stk purløg" med "fintsnittet" i notes feltet (IKKE "fintsnittet purløg")
- Andre krydderurter: "0,5 bundt timian", "0,25 bundt rosmarin"
- Kartofler: "500 g kartofler" (ikke "4 stk kartofler" eller "4 kartofler")
- Kød: "500 g hakket oksekød", "200 g kyllingebryst"
- Grøntsager: "2 stk gulerødder", "1 stk løg", "200 g broccoli"
- UNDGÅ duplikationer: Skriv kun "1 stk hvidløgsfed" ikke "1 stk hvidløgsfed" og "1 stk hvidløg"

Returnér kun valid JSON i det nøjagtige format herunder. Ingen ekstra tekst, ingen markdown.
Brug HTML i felterne summary, instructions_flat[].text og notes (enkle <p> eller <ul>/<ol> er nok).

Enheder: Brug gram, ml, tsk, spsk, stk, bundt.
Alle ingredienser i ingredients_flat skal have name, type, amount, unit, og notes (tom streng hvis ikke relevant).
VIKTIGT: amount skal være et positivt tal (f.eks. "2", "150", "0.5") - IKKE tom eller 0.
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
}`
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const completion = await response.json()
    const recipeContent = completion.choices[0]?.message?.content
    
    if (!recipeContent) {
      throw new Error('No recipe content generated')
    }

    // Parse the generated recipe
    const recipe = parseGeneratedRecipe(recipeContent, 'familiemad')
    
    console.log(`✅ Generated Familiemad recipe: ${recipe.title}`)

    // Generate Midjourney prompt
    const midjourneyPrompt = generateMidjourneyPrompt(recipe)
    console.log(`🎨 Generated Midjourney prompt: ${midjourneyPrompt.substring(0, 100)}...`)

    // Generate AI tips for the recipe
    let aiTips = ''
    try {
      console.log('💡 Generating AI tips for recipe...')
      const tipsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/generate-tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          difficulty: recipe.difficulty,
          totalTime: recipe.prepTime + recipe.cookTime,
          dietaryCategories: recipe.dietaryCategories
        })
      })

      if (tipsResponse.ok) {
        const tipsData = await tipsResponse.json()
        aiTips = tipsData.tips || ''
        console.log('✅ AI tips generated successfully')
      } else {
        console.log('⚠️ Failed to generate AI tips, continuing without tips')
      }
    } catch (error) {
      console.log('⚠️ Error generating AI tips:', error)
    }

    return NextResponse.json({
      success: true,
      recipe,
      midjourneyPrompt,
      aiTips
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


function generateMidjourneyPrompt(recipe: any): string {
  // Extract main ingredients for the visual description
  const mainIngredients = recipe.ingredients_flat
    ?.filter((item: any) => item.type === 'ingredient')
    ?.slice(0, 6) // Take first 6 ingredients
    ?.map((item: any) => {
      const amount = item.amount || '1'
      const unit = item.unit || ''
      const name = item.name?.toLowerCase() || ''
      
      // Format ingredient nicely
      if (unit === 'stk') {
        return `${amount} ${name}`
      } else if (unit === 'g' || unit === 'ml') {
        return `${amount}${unit} ${name}`
      } else {
        return `${amount} ${unit} ${name}`
      }
    })
    ?.join(', ') || ''

  // Translate Danish title to English for Midjourney
  const englishTitle = translateTitleForMidjourney(recipe.title || 'opskrift')
  
  // Create a food-focused description
  const foodDescription = mainIngredients && mainIngredients.length > 0 
    ? `*${englishTitle}, featuring ${mainIngredients}, beautifully plated*`
    : `*${englishTitle}, beautifully plated*`
  
  // Base Midjourney prompt structure
  const basePrompt = `top-down hyperrealistic photo of ${foodDescription}, served on a white ceramic plate on a rustic dark wooden tabletop, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3`
  
  return basePrompt
}

function translateTitleForMidjourney(danishTitle: string): string {
  // Simple translation mapping for common Danish food terms
  const translations: Record<string, string> = {
    // Main dishes
    'kylling': 'chicken',
    'kyllingefrikassé': 'chicken fricassee',
    'kyllingefrikasse': 'chicken fricassee',
    'hjemmelavet': 'homemade',
    'kartoffel': 'potato',
    'kartofler': 'potatoes',
    'fisk': 'fish',
    'fiskefilet': 'fish fillet',
    'bøf': 'beef',
    'hakkebøf': 'beef patty',
    'frikadeller': 'meatballs',
    'pølse': 'sausage',
    'pasta': 'pasta',
    'ris': 'rice',
    'nudler': 'noodles',
    'frikassé': 'fricassee',
    'frikasse': 'fricassee',
    'steg': 'roast',
    'stegt': 'roasted',
    
    // Vegetables
    'gulerødder': 'carrots',
    'gulerod': 'carrot',
    'løg': 'onions',
    'hvidløg': 'garlic',
    'broccoli': 'broccoli',
    'spinat': 'spinach',
    'tomat': 'tomato',
    'tomater': 'tomatoes',
    'agurk': 'cucumber',
    'peberfrugt': 'bell pepper',
    'champignon': 'mushrooms',
    'kartoffelmos': 'mashed potatoes',
    'kartoffeltopping': 'potato topping',
    
    // Cooking methods
    'bagt': 'baked',
    'kogt': 'boiled',
    'grillet': 'grilled',
    'ovnbagt': 'oven-baked',
    'sauteret': 'sautéed',
    
    // Descriptive words
    'børnevenlig': 'kid-friendly',
    'børnevenlige': 'kid-friendly',
    'nem': 'easy',
    'hurtig': 'quick',
    'sund': 'healthy',
    'lækker': 'delicious',
    'smagfuld': 'flavorful',
    'krydret': 'spiced',
    'mild': 'mild',
    'cremet': 'creamy',
    'sprød': 'crispy',
    'saftig': 'juicy',
    
    // Common combinations
    'med': 'with',
    'og': 'and',
    'i': 'in',
    'på': 'on',
    'til': 'for',
    'fad': 'dish',
    'ret': 'dish',
    'opskrift': 'recipe',
    'sovs': 'sauce',
    'sauce': 'sauce',
    'dressing': 'dressing',
    'topping': 'topping'
  }
  
  let englishTitle = danishTitle.toLowerCase()
  
  // Replace Danish words with English equivalents
  Object.entries(translations).forEach(([danish, english]) => {
    const regex = new RegExp(`\\b${danish}\\b`, 'gi')
    englishTitle = englishTitle.replace(regex, english)
  })
  
  // Clean up any remaining Danish characters
  englishTitle = englishTitle
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/Æ/g, 'Ae')
    .replace(/Ø/g, 'Oe')
    .replace(/Å/g, 'Aa')
  
  // Capitalize first letter of each word
  return englishTitle
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
        .map((item: any) => {
          const amount = parseFloat(item.amount)
          if (isNaN(amount) || amount <= 0) {
            console.warn(`Invalid amount for ingredient ${item.name}: ${item.amount}, using 1 as default`)
          }
          return {
            name: item.name,
            amount: isNaN(amount) || amount <= 0 ? 1 : amount,
            unit: item.unit || 'stk',
            notes: item.notes || ''
          }
        })
      
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
        servings: 2, // Always 2 portions for familiemad
        prepTime: parseInt(recipe.prep_time) || 15,
        cookTime: parseInt(recipe.cook_time) || 30,
        difficulty: 'Nem',
        dietaryCategories: ['Familiemad'], // Capitalize category
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
    recipe.dietaryCategories = ['Familiemad']
    
    // Ensure all required fields exist
    return {
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: 2, // Always 2 portions for familiemad
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      difficulty: recipe.difficulty || 'Nem',
      dietaryCategories: recipe.dietaryCategories || ['Familiemad'],
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

