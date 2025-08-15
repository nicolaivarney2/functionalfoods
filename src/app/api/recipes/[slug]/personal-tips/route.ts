import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const { slug } = resolvedParams
    const { tips } = await request.json()

    // Create Supabase client dynamically
    const supabase = createSupabaseServerClient()

    const { error } = await supabase
      .from('recipes')
      .update({ personal_tips: tips })
      .eq('slug', slug)

    if (error) {
      console.error('Error updating personal tips:', error)
      return NextResponse.json(
        { error: 'Failed to update personal tips' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in personal tips API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const { slug } = resolvedParams

    // Create Supabase client dynamically
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('recipes')
      .select('personal_tips')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error fetching personal tips:', error)
      return NextResponse.json(
        { error: 'Failed to fetch personal tips' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tips: data?.personal_tips || '' })
  } catch (error) {
    console.error('Error in personal tips API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
