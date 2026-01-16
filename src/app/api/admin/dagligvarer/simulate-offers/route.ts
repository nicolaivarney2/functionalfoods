import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    console.log('🎯 Starting real offers fetch...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials'
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Get real offers from database (products where price < original_price)
    const { data: realOffers, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('id, name, price, original_price, category, store')
      .eq('store', 'REMA 1000')
      .not('original_price', 'is', null)
      .order('price', { ascending: true })
      .limit(100) // Get up to 100 real offers
    
    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch real offers: ${fetchError.message}`
      }, { status: 500 })
    }
    
    if (!realOffers || realOffers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No real offers found in database'
      }, { status: 404 })
    }
    
    console.log(`🎯 Found ${realOffers.length} real offers in database`)
    
    // Calculate discount percentages for real offers
    const offersWithDiscounts = realOffers.map(product => {
      const discountPercentage = Math.round(((product.original_price - product.price) / product.original_price) * 100)
      return {
        ...product,
        discount_percentage: discountPercentage
      }
    })
    
    // Log sample offers
    console.log('🎯 Sample real offers:', offersWithDiscounts.slice(0, 5).map(p => ({
      name: p.name,
      price: p.price,
      original_price: p.original_price,
      discount_percentage: p.discount_percentage,
      category: p.category
    })))
    
    const result = {
      success: true,
      message: `Found ${realOffers.length} real offers in database`,
      timestamp: new Date().toISOString(),
      offers: offersWithDiscounts,
      count: realOffers.length
    }

    console.log(`🎉 Real offers fetch completed: ${realOffers.length} offers found`)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Error in real offers fetch:', error)
    return NextResponse.json({
      success: false,
      message: 'Real offers fetch failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
