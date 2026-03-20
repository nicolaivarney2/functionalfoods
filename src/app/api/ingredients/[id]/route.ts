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
    const { category, is_basis, grams_per_unit } = body

    // Allow updating category, is_basis, or grams_per_unit
    if (category === undefined && is_basis === undefined && grams_per_unit === undefined) {
      return NextResponse.json(
        { error: 'Provide at least one of: category, is_basis, grams_per_unit' },
        { status: 400 }
      )
    }

    console.log(`🔄 Updating ingredient ${id}`, { category, is_basis, grams_per_unit })

    const supabase = createSupabaseServiceClient()

    // First check if ingredient exists
    const { data: existing, error: checkError } = await supabase
      .from('ingredients')
      .select('id, name, category, is_basis, grams_per_unit')
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

    console.log(`✅ Found ingredient: ${existing?.name}, current category: ${existing?.category}, is_basis: ${existing?.is_basis}`)

    // Build update object with only provided fields
    const updateData: { category?: string; is_basis?: boolean; grams_per_unit?: number | null } = {}
    if (category !== undefined) updateData.category = category
    if (is_basis !== undefined) updateData.is_basis = is_basis
    if (grams_per_unit !== undefined) updateData.grams_per_unit = grams_per_unit === null || grams_per_unit === '' ? null : Number(grams_per_unit)

    // Update fields - don't try to update timestamp columns
    // Let the database handle timestamps via triggers/defaults
    const { data, error } = await supabase
      .from('ingredients')
      .update(updateData)
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

    console.log(`✅ Successfully updated ingredient ${id}`, updateData)
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

