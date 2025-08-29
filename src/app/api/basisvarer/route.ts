import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Hent familie basisvarer
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
      .from('family_basisvarer')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching basisvarer:', error)
      return NextResponse.json(
        { error: 'Failed to fetch basisvarer', details: error.message },
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

// POST - Tilføj ny basisvare
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { familyId, itemName, category } = body
    
    if (!familyId || !itemName) {
      return NextResponse.json(
        { error: 'Family ID and item name are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()
    
    const { data, error } = await supabase
      .from('family_basisvarer')
      .insert({
        family_id: familyId,
        item_name: itemName,
        category: category || 'Generelt'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating basisvare:', error)
      return NextResponse.json(
        { error: 'Failed to create basisvare', details: error.message },
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

// DELETE - Fjern basisvare
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
      .from('family_basisvarer')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting basisvare:', error)
      return NextResponse.json(
        { error: 'Failed to delete basisvare', details: error.message },
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
