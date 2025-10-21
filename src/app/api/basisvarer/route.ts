import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

// GET - Hent brugerens basisvarer
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's basisvarer with product details
    const { data, error } = await supabase
      .from('user_basisvarer')
      .select(`
        id,
        quantity,
        notes,
        created_at,
        product:supermarket_products(
          id,
          name,
          category,
          price,
          unit,
          image_url,
          store,
          is_on_sale,
          original_price
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching basisvarer:', error)
      return NextResponse.json(
        { error: 'Failed to fetch basisvarer', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ basisvarer: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Tilføj produkt til basisvarer
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { product_id, quantity = 1, notes } = await request.json()

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Add product to user's basisvarer
    const { data, error } = await supabase
      .from('user_basisvarer')
      .insert({
        user_id: user.id,
        product_id,
        quantity,
        notes
      })
      .select(`
        id,
        quantity,
        notes,
        created_at,
        product:supermarket_products(
          id,
          name,
          category,
          price,
          unit,
          image_url,
          store,
          is_on_sale,
          original_price
        )
      `)
      .single()

    if (error) {
      console.error('Error adding to basisvarer:', error)
      return NextResponse.json({ error: 'Failed to add to basisvarer' }, { status: 500 })
    }

    return NextResponse.json({ basisvarer: data })
  } catch (error) {
    console.error('Error in POST /api/basisvarer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Fjern fra basisvarer
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Remove from user's basisvarer
    const { error } = await supabase
      .from('user_basisvarer')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error removing from basisvarer:', error)
      return NextResponse.json({ error: 'Failed to remove from basisvarer' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/basisvarer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
