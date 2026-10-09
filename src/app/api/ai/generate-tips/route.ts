import { NextRequest, NextResponse } from 'next/server'
import { generateRecipeTips } from '@/lib/ff-recipe-tips'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface GenerateTipsRequest {
  title: string
  description?: string
  difficulty?: string
  totalTime?: number
  dietaryCategories?: string[]
  ingredients?: Array<{ name?: string; notes?: string } | string>
  instructions?: Array<{ instruction?: string; text?: string } | string>
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateTipsRequest = await request.json()
    const ingredients = (body.ingredients || [])
      .map((ing) => {
        if (typeof ing === 'string') return ing.trim()
        const name = String(ing?.name || '').trim()
        if (!name) return ''
        const notes = typeof ing.notes === 'string' && ing.notes.trim() ? ` (${ing.notes.trim()})` : ''
        return `${name}${notes}`
      })
      .filter(Boolean)
    const instructions = (body.instructions || [])
      .map((step) => {
        if (typeof step === 'string') return step.trim()
        return String(step?.instruction || step?.text || '').trim()
      })
      .filter(Boolean)
      .slice(0, 10)

    const tips = await generateRecipeTips({
      title: body.title,
      description: body.description,
      nicheLabel: (body.dietaryCategories || []).join(', ') || 'Generel',
      ingredients,
      instructions,
    })

    return NextResponse.json({
      success: true,
      tips,
      message: 'AI tips genereret succesfuldt',
    })
  } catch (error: unknown) {
    console.error('Error generating AI tips:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
