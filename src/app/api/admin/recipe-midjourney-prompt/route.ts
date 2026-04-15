import { NextRequest, NextResponse } from 'next/server'
import { generateMidjourneyPromptWithMeta } from '@/lib/midjourney-generator'

/**
 * Genererer Midjourney-prompt ud fra en opskrifts-kladde (fx efter redigering eller hvis generatoren ikke sendte med).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const recipe = body?.recipe
    if (!recipe || typeof recipe !== 'object') {
      return NextResponse.json({ success: false, error: 'recipe er påkrævet' }, { status: 400 })
    }

    const meta = await generateMidjourneyPromptWithMeta(recipe)
    return NextResponse.json({
      success: true,
      midjourneyPrompt: meta.prompt,
      midjourneyPromptSource: meta.source,
      midjourneyPromptError: meta.error || null,
    })
  } catch (error) {
    console.error('recipe-midjourney-prompt:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Ukendt fejl',
      },
      { status: 500 }
    )
  }
}
