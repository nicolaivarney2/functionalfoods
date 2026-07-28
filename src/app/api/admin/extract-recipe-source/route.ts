import { NextRequest, NextResponse } from 'next/server'
import { fetchStructuredRecipeFromUrl } from '@/lib/recipe-url-fetch'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''

    if (!rawUrl) {
      return NextResponse.json({ error: 'URL mangler' }, { status: 400 })
    }

    let fetched
    try {
      fetched = await fetchStructuredRecipeFromUrl(rawUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunne ikke hente linket'
      const status =
        message.includes('Ugyldigt') || message.includes('mangler') || message.includes('kan ikke')
          ? 400
          : 502
      return NextResponse.json({ error: message }, { status })
    }

    const structured = fetched.structured
    // Titel alene er ikke nok — AI får så "(ikke fundet)" på ingredienser/fremgangsmåde
    // og parse/generering fejler ofte (fx SenseMyDiet med andre overskrifter end Ketoliv).
    if (!structured.ingredientsText?.trim() && !structured.instructionsText?.trim()) {
      return NextResponse.json(
        {
          error:
            'Kunne ikke læse ingredienser eller fremgangsmåde fra linket. Prøv en anden side, eller indsæt opskriften manuelt som inspiration.',
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      ok: true,
      ...structured,
      sourceText: structured.formattedSource,
      truncated: structured.rawText.length >= 12_000,
    })
  } catch (error) {
    console.error('extract-recipe-source', error)
    return NextResponse.json({ error: 'Kunne ikke hente opskriftslink' }, { status: 500 })
  }
}
