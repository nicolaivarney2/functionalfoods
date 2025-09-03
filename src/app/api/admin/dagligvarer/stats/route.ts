import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const shop = searchParams.get('shop') || 'rema1000'
    
    const supabase = createSupabaseServiceClient()
    
    // Get basic stats
    const { data: products, error: productsError } = await supabase
      .from('supermarket_products')
      .select('price, is_on_sale, category, last_updated')
      .eq('source', shop)
    
    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`)
    }
    
    const totalProducts = products?.length || 0
    const productsOnSale = products?.filter(p => p.is_on_sale).length || 0
    const categories = [...new Set(products?.map(p => p.category).filter(Boolean))] || []
    const averagePrice = products?.length > 0 
      ? products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length 
      : 0
    const lastUpdate = products?.length > 0 
      ? products.reduce((latest, p) => {
          const pDate = new Date(p.last_updated || 0)
          const lDate = new Date(latest || 0)
          return pDate > lDate ? p.last_updated : latest
        }, null)
      : null
    
    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        productsOnSale,
        categories,
        averagePrice,
        lastUpdate
      }
    })
    
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to load stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
