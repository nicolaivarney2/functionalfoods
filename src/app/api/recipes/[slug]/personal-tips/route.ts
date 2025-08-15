import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { personalTips } = await request.json()
    const recipeSlug = params.slug

    if (!personalTips) {
      return NextResponse.json(
        { error: 'personalTips er påkrævet' },
        { status: 400 }
      )
    }

    // Opdater personalTips i databasen
    const { error } = await supabaseServer
      .from('recipes')
      .update({ 
        personaltips: personalTips,
        updatedat: new Date().toISOString()
      })
      .eq('slug', recipeSlug)

    if (error) {
      console.error('Error updating personal tips:', error)
      return NextResponse.json(
        { error: 'Kunne ikke opdatere personlige tips' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Personlige tips opdateret',
      recipeSlug 
    })

  } catch (error) {
    console.error('Error in personal tips API:', error)
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const recipeSlug = params.slug

    // Hent personalTips fra databasen
    const { data, error } = await supabaseServer
      .from('recipes')
      .select('personaltips')
      .eq('slug', recipeSlug)
      .single()

    if (error) {
      console.error('Error fetching personal tips:', error)
      return NextResponse.json(
        { error: 'Kunne ikke hente personlige tips' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      personalTips: data.personaltips || '',
      recipeSlug 
    })

  } catch (error) {
    console.error('Error in personal tips GET API:', error)
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    )
  }
}
