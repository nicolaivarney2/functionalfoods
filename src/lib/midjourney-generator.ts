import OpenAI from 'openai'

/**
 * Centralized Midjourney prompt generator using ChatGPT for accurate translation
 * This ensures consistent, high-quality prompts across all recipe generators
 */
export async function generateMidjourneyPrompt(recipe: any): Promise<string> {
  // Validate recipe object
  if (!recipe || !recipe.title) {
    console.warn('⚠️ Invalid recipe object passed to generateMidjourneyPrompt:', recipe)
    return `top-down hyperrealistic photo of *delicious meal, beautifully plated*, served on a dark gray ceramic plate on a rustic dark textured matte surface, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3`
  }
  
  try {
    // Extract main ingredients (first 3) for the visual description
    const mainIngredients = recipe.ingredients
      ?.slice(0, 3)
      .map((ing: any) => ing.name)
      .filter((name: string) => name && name.trim())
      .join(', ') || ''

    console.log('🎨 Generating Midjourney prompt for:', recipe.title, 'with ingredients:', mainIngredients)
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    if (!openai.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Always translate title and ingredients separately to ensure accuracy
    // This handles cases where title might already contain English words
    console.log('🔄 Translating title separately...')
    const titleTranslation = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a food translation expert. Translate Danish food recipe titles to English for Midjourney image generation.

CRITICAL RULES:
1. Translate EVERY Danish word to English, even if it looks similar to English
2. Common Danish food words: laks=salmon, citron=lemon, kartofler=potatoes, løg=onion, hvidløgsfed=garlic cloves, olivenolie=olive oil, ærter=peas, spinat=spinach, rejer=shrimp, cremet=creamy
3. Cooking methods: ovnbagte/ovnbagt=roasted, stegt=fried, kogt=boiled, grillet=grilled
4. If title contains mixed Danish/English, translate ALL parts to pure English
5. Return ONLY the English translation, no explanations, no quotes, no markdown

EXAMPLES:
- "Mexicansk chicken and rice i én gryde" → "Mexican one-pot chicken and rice"
- "Laks med citron og ovnbagte kartofler" → "Salmon with lemon and roasted potatoes"
- "Cremet rejericeotto med ærter" → "Creamy shrimp risotto with peas"
- "Kylling med olivenolie og spinat" → "Chicken with olive oil and spinach"`
        },
        {
          role: 'user',
          content: `Translate this recipe title to English (translate ALL parts, even if some words are already English): "${recipe.title}"`
        }
      ],
      max_tokens: 100,
      temperature: 0.5
    })
    
    const translatedTitle = titleTranslation.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || recipe.title
    console.log('📝 Translated title:', translatedTitle)
    
    // Translate ingredients separately
    let translatedIngredients = ''
    if (mainIngredients && mainIngredients.length > 0) {
      console.log('🔄 Translating ingredients separately...')
      const ingredientsTranslation = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a food translation expert. Translate Danish ingredient names to English for Midjourney image generation.

CRITICAL RULES:
1. Translate EVERY Danish word to English, even compound words
2. Common translations: olivenolie=olive oil, løg=onion, hvidløgsfed=garlic cloves, ærter=peas, spinat=spinach, rejer=shrimp, laks=salmon, citron=lemon, kartofler=potatoes
3. Split compound words: "rejericeotto" = "shrimp risotto", "kyllingebryst" = "chicken breast"
4. Return ONLY the English translation, comma-separated, no explanations, no quotes

EXAMPLES:
- "olivenolie, løg, hvidløgsfed" → "olive oil, onion, garlic cloves"
- "rejer, ærter, spinat" → "shrimp, peas, spinach"
- "laks, citron, kartofler" → "salmon, lemon, potatoes"`
          },
          {
            role: 'user',
            content: `Translate these Danish ingredient names to English: "${mainIngredients}"`
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      })
      
      translatedIngredients = ingredientsTranslation.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || mainIngredients
      console.log('📝 Translated ingredients:', translatedIngredients)
    }
    
    // Build final English description
    const englishDescription = translatedIngredients
      ? `${translatedTitle}, featuring ${translatedIngredients}`
      : translatedTitle
    
    console.log('✅ Final English description:', englishDescription)
    
    // Create a food-focused description
    const foodDescription = `*${englishDescription}, beautifully plated*`
    
    // Base Midjourney prompt structure with rustic dark background
    const basePrompt = `top-down hyperrealistic photo of ${foodDescription}, served on a dark gray ceramic plate on a rustic dark textured matte surface, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3`
    
    return basePrompt
  } catch (error) {
    console.error('Error generating Midjourney prompt:', error)
    
    // Fallback: Try to translate at least the title
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      
      const titleTranslation = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Translate Danish food terms to English. Return ONLY the English translation, no explanations, no quotes.'
          },
          {
            role: 'user',
            content: `Translate to English: "${recipe.title || 'recipe'}"`
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
      
      const translatedTitle = titleTranslation.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || 'recipe'
      const foodDescription = `*${translatedTitle}, beautifully plated*`
      
      return `top-down hyperrealistic photo of ${foodDescription}, served on a dark gray ceramic plate on a rustic dark textured matte surface, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3`
    } catch (fallbackError) {
      console.error('Fallback translation also failed:', fallbackError)
      
      // Last resort: Build prompt from recipe data directly (even if Danish)
      const title = recipe.title || 'recipe'
      const ingredients = recipe.ingredients
        ?.slice(0, 3)
        .map((ing: any) => ing.name)
        .filter((name: string) => name && name.trim())
        .join(', ') || ''
      
      // Try to manually translate common Danish food terms
      const manualTranslations: Record<string, string> = {
        'pasta': 'pasta',
        'kylling': 'chicken',
        'kyllingebryst': 'chicken breast',
        'grøntsager': 'vegetables',
        'broccoli': 'broccoli',
        'gulerødder': 'carrots',
        'løg': 'onion',
        'hvidløg': 'garlic',
        'hvidløgsfed': 'garlic clove',
        'kartofler': 'potatoes',
        'ris': 'rice',
        'risotto': 'risotto',
        'frikadeller': 'meatballs',
        'fisk': 'fish',
        'laks': 'salmon',
        'rejer': 'shrimp',
        'citron': 'lemon',
        'oksekød': 'beef',
        'svinekød': 'pork',
        'olivenolie': 'olive oil',
        'ærter': 'peas',
        'spinat': 'spinach',
        'cremet': 'creamy',
        'one-pot': 'one-pot',
        'i én gryde': 'one-pot',
        'med': 'with',
        'og': 'and',
        'mexicansk': 'mexican',
        'rød peberfrugt': 'red bell pepper',
        'peberfrugt': 'bell pepper',
        'gulerod': 'carrot',
        'gulerødder': 'carrots',
        'ovnbagte': 'roasted',
        'ovnbagt': 'roasted',
        'stegt': 'fried',
        'kogt': 'boiled',
        'grillet': 'grilled',
        'dampet': 'steamed'
      }
      
      // Simple translation attempt - handle compound words first
      let englishTitle = title.toLowerCase()
      
      // Handle compound words (longest first to avoid partial matches)
      const compoundWords: Record<string, string> = {
        'rejericeotto': 'shrimp risotto',
        'kyllingebryst': 'chicken breast',
        'hvidløgsfed': 'garlic cloves',
        'olivenolie': 'olive oil',
        'rød peberfrugt': 'red bell pepper',
        'peberfrugt': 'bell pepper'
      }
      
      Object.entries(compoundWords).forEach(([dk, en]) => {
        englishTitle = englishTitle.replace(new RegExp(dk, 'gi'), en)
      })
      
      // Then handle single words
      Object.entries(manualTranslations).forEach(([dk, en]) => {
        // Skip if already handled as compound word
        if (!compoundWords[dk]) {
          englishTitle = englishTitle.replace(new RegExp(`\\b${dk}\\b`, 'gi'), en)
        }
      })
      
      // Translate ingredients too
      let englishIngredients = ingredients.toLowerCase()
      Object.entries(compoundWords).forEach(([dk, en]) => {
        englishIngredients = englishIngredients.replace(new RegExp(dk, 'gi'), en)
      })
      Object.entries(manualTranslations).forEach(([dk, en]) => {
        if (!compoundWords[dk]) {
          englishIngredients = englishIngredients.replace(new RegExp(`\\b${dk}\\b`, 'gi'), en)
        }
      })
      
      // Capitalize first letter
      englishTitle = englishTitle.charAt(0).toUpperCase() + englishTitle.slice(1)
      
      const foodDescription = ingredients
        ? `*${englishTitle}, featuring ${englishIngredients}, beautifully plated*`
        : `*${englishTitle}, beautifully plated*`
      
      console.log('⚠️ Using manual translation fallback:', foodDescription)
      
      return `top-down hyperrealistic photo of ${foodDescription}, served on a dark gray ceramic plate on a rustic dark textured matte surface, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3`
    }
  }
}
