import OpenAI from 'openai'

/**
 * Centralized Midjourney prompt generator using ChatGPT for accurate translation
 * This ensures consistent, high-quality prompts across all recipe generators
 */
export async function generateMidjourneyPrompt(recipe: any): Promise<string> {
  try {
    // Extract main ingredients (first 3) for the visual description
    const mainIngredients = recipe.ingredients
      ?.slice(0, 3)
      .map((ing: any) => ing.name)
      .filter((name: string) => name && name.trim())
      .join(', ') || ''

    // Create Danish description for translation
    const danishDescription = `${recipe.title || 'opskrift'}${mainIngredients ? ', featuring ' + mainIngredients : ''}`
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Use ChatGPT to translate the entire description to English
    const translationResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a food translation expert. Translate Danish food terms to English for Midjourney image generation. Return ONLY the English translation, no explanations. Focus on food photography terms.'
        },
        {
          role: 'user',
          content: `Translate this Danish food description to English: "${danishDescription}"`
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    })

    const englishDescription = translationResponse.choices[0]?.message?.content?.trim() || danishDescription
    
    // Create a food-focused description
    const foodDescription = `*${englishDescription}, beautifully plated*`
    
    // Base Midjourney prompt structure (matches your working example)
    const basePrompt = `top-down hyperrealistic photo of ${foodDescription}, served on a white ceramic plate on a rustic dark wooden tabletop, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3`
    
    return basePrompt
  } catch (error) {
    console.error('Error generating Midjourney prompt:', error)
    
    // Fallback to original Danish if translation fails
    const mainIngredients = recipe.ingredients
      ?.slice(0, 3)
      .map((ing: any) => ing.name)
      .filter((name: string) => name && name.trim())
      .join(', ') || ''

    const foodDescription = mainIngredients && mainIngredients.length > 0 
      ? `*${recipe.title || 'opskrift'}, featuring ${mainIngredients}, beautifully plated*`
      : `*${recipe.title || 'opskrift'}, beautifully plated*`
    
    return `top-down hyperrealistic photo of ${foodDescription}, served on a white ceramic plate on a rustic dark wooden tabletop, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3`
  }
}
