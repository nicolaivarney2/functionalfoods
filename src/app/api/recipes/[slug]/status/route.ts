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
    const { status } = await request.json()

    // Create Supabase client dynamically
    const supabase = createSupabaseServerClient()

    const { error } = await supabase
      .from('recipes')
      .update({ status })
      .eq('slug', slug)

    if (error) {
      console.error('Error updating recipe status:', error)
      return NextResponse.json(
        { error: 'Failed to update recipe status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in recipe status API:', error)
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
      .select('status')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error fetching recipe status:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recipe status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: data?.status || 'draft' })
  } catch (error) {
    console.error('Error in recipe status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
