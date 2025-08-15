export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🧪 Testing database connection...')
    
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json(
        { error: 'Database connection failed', details: error },
        { status: 500 }
      )
    }
    
    console.log('✅ Database connection successful')
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection working',
      data: data 
    })
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unexpected error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 