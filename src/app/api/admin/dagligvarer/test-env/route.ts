import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing environment variables and Supabase connection...')
    
    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!(process.env as any).NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!(process.env as any).SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: (process.env as any).NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKeyLength: (process.env as any).SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: (process.env as any).VERCEL_ENV
    }
    
    console.log('🔍 Environment check:', envCheck)
    
    // Test Supabase connection with service role
    let supabaseTest = null
    let anonTest = null
    
    try {
      const supabase = createSupabaseServerClient()
      
      // Try a simple query with service role
      const { data, error } = await supabase
        .from('supermarket_products')
        .select('*')
        .limit(1)
      
      supabaseTest = {
        success: !error,
        error: error?.message || null,
        data: data
      }
      
      console.log('✅ Supabase service role test:', supabaseTest)
      
    } catch (supabaseError) {
      supabaseTest = {
        success: false,
        error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
        data: null
      }
      console.error('❌ Supabase service role failed:', supabaseError)
    }
    
    // Test with anon key to see if database is accessible
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const anonSupabase = createClient(
        (process.env as any).NEXT_PUBLIC_SUPABASE_URL!,
        (process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data, error } = await anonSupabase
        .from('supermarket_products')
        .select('*')
        .limit(1)
      
      anonTest = {
        success: !error,
        error: error?.message || null,
        data: data
      }
      
      console.log('✅ Supabase anon key test:', anonTest)
      
    } catch (anonError) {
      anonTest = {
        success: false,
        error: anonError instanceof Error ? anonError.message : 'Unknown error',
        data: null
      }
      console.error('❌ Supabase anon key failed:', anonError)
    }
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      supabaseTest,
      anonTest,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error in environment test:', error)
    
    return NextResponse.json(
      { 
        error: 'Environment test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
