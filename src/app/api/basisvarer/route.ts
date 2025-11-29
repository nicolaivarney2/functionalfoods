import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET - Hent brugerens basisvarer
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceKey)

    // Get user from Authorization header (Bearer token fra klienten)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's basisvarer (ingredienser)
    const { data, error } = await supabase
      .from('user_basisvarer')
      .select(`
        id,
        ingredient_name,
        quantity,
        unit,
        notes,
        created_at
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceKey)

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ingredient_name, quantity = 1, unit = 'stk', notes } = await request.json()

    if (!ingredient_name) {
      return NextResponse.json({ error: 'Ingredient name is required' }, { status: 400 })
    }

    // Add ingredient to user's basisvarer
    const { data, error } = await supabase
      .from('user_basisvarer')
      .insert({
        user_id: user.id,
        ingredient_name: ingredient_name.trim(),
        quantity,
        unit,
        notes
      })
      .select(`
        id,
        ingredient_name,
        quantity,
        unit,
        notes,
        created_at
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

// PUT - Opdater basisvarer quantity
export async function PUT(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceKey)

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, quantity } = await request.json()

    if (!id || !quantity) {
      return NextResponse.json({ error: 'ID and quantity are required' }, { status: 400 })
    }

    // Update basisvarer quantity
    const { data, error } = await supabase
      .from('user_basisvarer')
      .update({ quantity })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        id,
        ingredient_name,
        quantity,
        unit,
        notes,
        created_at
      `)
      .single()

    if (error) {
      console.error('Error updating basisvarer:', error)
      return NextResponse.json({ error: 'Failed to update basisvarer' }, { status: 500 })
    }

    return NextResponse.json({ basisvarer: data })
  } catch (error) {
    console.error('Error in PUT /api/basisvarer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Fjern fra basisvarer
export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceKey)

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
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
