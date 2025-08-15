import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Create Supabase client dynamically
    const supabase = createSupabaseServerClient()
    
    const { status, scheduledDate, scheduledTime } = await request.json()
    const recipeSlug = params.slug

    if (!status) {
      return NextResponse.json(
        { error: 'status er påkrævet' },
        { status: 400 }
      )
    }

    // Opdater status i databasen
    const updateData: any = { 
      status: status,
      updatedat: new Date().toISOString()
    }

    // Tilføj scheduled date hvis den er givet
    if (scheduledDate) {
      updateData.scheduleddate = scheduledDate
    }

    // Tilføj scheduled time hvis den er givet
    if (scheduledTime) {
      updateData.scheduledtime = scheduledTime
    }

    const { error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('slug', recipeSlug)

    if (error) {
      console.error('Error updating recipe status:', error)
      return NextResponse.json(
        { error: 'Kunne ikke opdatere recipe status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Recipe status opdateret',
      recipeSlug,
      status,
      scheduledDate
    })

  } catch (error) {
    console.error('Error in recipe status API:', error)
    
    // Handle specific environment variable errors
    if (error instanceof Error && error.message.includes('Supabase server client missing env')) {
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 })
    }
    
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
    // Create Supabase client dynamically
    const supabase = createSupabaseServerClient()
    
    const recipeSlug = params.slug

    // Hent status fra databasen
    const { data, error } = await supabase
      .from('recipes')
      .select('status, scheduleddate, scheduledtime')
      .eq('slug', recipeSlug)
      .single()

    if (error) {
      console.error('Error fetching recipe status:', error)
      return NextResponse.json(
        { error: 'Kunne ikke hente recipe status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      status: data.status || 'draft',
      scheduledDate: data.scheduleddate,
      scheduledTime: data.scheduledtime,
      recipeSlug 
    })

  } catch (error) {
    console.error('Error in recipe status GET API:', error)
    
    // Handle specific environment variable errors
    if (error instanceof Error && error.message.includes('Supabase server client missing env')) {
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 })
    }
    
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    )
  }
}
