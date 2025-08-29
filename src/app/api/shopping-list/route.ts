import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Hent sekundær indkøbsliste
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')
    
    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()
    
    const { data, error } = await supabase
      .from('secondary_shopping_list')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching shopping list:', error)
      return NextResponse.json(
        { error: 'Failed to fetch shopping list', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Tilføj vare til indkøbsliste
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { familyId, itemName, quantity, unit } = body
    
    if (!familyId || !itemName) {
      return NextResponse.json(
        { error: 'Family ID and item name are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()
    
    const { data, error } = await supabase
      .from('secondary_shopping_list')
      .insert({
        family_id: familyId,
        item_name: itemName,
        quantity: quantity || 1,
        unit: unit || 'stk'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding item to shopping list:', error)
      return NextResponse.json(
        { error: 'Failed to add item', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Opdater vare status (checked/unchecked)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, isChecked } = body
    
    if (id === undefined || isChecked === undefined) {
      return NextResponse.json(
        { error: 'Item ID and checked status are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()
    
    const { error } = await supabase
      .from('secondary_shopping_list')
      .update({ is_checked: isChecked })
      .eq('id', id)

    if (error) {
      console.error('Error updating item:', error)
      return NextResponse.json(
        { error: 'Failed to update item', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
      )
  }
}

// DELETE - Fjern vare fra indkøbsliste
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()
    
    const { error } = await supabase
      .from('secondary_shopping_list')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting item:', error)
      return NextResponse.json(
        { error: 'Failed to delete item', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
