import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { category } = body

    console.log(`🔄 Updating ingredient ${id} with category: ${category}`)

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()

    // First check if ingredient exists
    const { data: existing, error: checkError } = await supabase
      .from('ingredients')
      .select('id, name, category')
      .eq('id', id)
      .single()

    if (checkError) {
      console.error('❌ Error checking ingredient:', checkError)
      return NextResponse.json(
        { 
          error: 'Ingredient not found', 
          details: checkError.message 
        },
        { status: 404 }
      )
    }

    console.log(`✅ Found ingredient: ${existing?.name}, current category: ${existing?.category}`)

    // Update only category - don't try to update timestamp columns
    // Let the database handle timestamps via triggers/defaults
    const { data, error } = await supabase
      .from('ingredients')
      .update({ category })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating ingredient category:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      console.error('❌ Error code:', error.code)
      console.error('❌ Error hint:', error.hint)
      return NextResponse.json(
        { 
          error: 'Failed to update ingredient category', 
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully updated ingredient ${id} category to ${category}`)
    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('❌ Error in /api/ingredients/[id] PUT:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update ingredient category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

