import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const { slug } = resolvedParams

    // Create Supabase client dynamically
    const supabase = createSupabaseServerClient()

    // Delete the recipe
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('slug', slug)

    if (error) {
      console.error('Error deleting recipe:', error)
      return NextResponse.json(
        { error: 'Failed to delete recipe' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete recipe API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


