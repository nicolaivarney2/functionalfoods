import { NextRequest, NextResponse } from 'next/server'
import { importGomaProducts } from '@/lib/goma-import'

export async function POST(request: NextRequest) {
  console.log('🚀 Goma import endpoint called')
  
  try {
    const body = await request.json().catch(() => ({}))
    console.log('📥 Request body:', JSON.stringify(body))

    const stores: string[] = Array.isArray(body.stores) && body.stores.length > 0
      ? body.stores
      : ['Netto']

    const limit = typeof body.limit === 'number' ? body.limit : 100
    const pages = typeof body.pages === 'number' ? body.pages : 1

    console.log(`🔄 Starting import: stores=${stores.join(',')}, limit=${limit}, pages=${pages}`)

    const result = await importGomaProducts({
      stores,
      limit,
      pages,
      onProgress: (info) => {
        console.log(
          `📊 Goma import progress – store=${info.store}, page=${info.page}, imported=${info.imported}/${info.total}`,
        )
      },
    })

    console.log(`✅ Import completed: ${result.totalImported} products imported`)

    // Verify products were actually saved
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { count: productCount, error: productCountError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    
    const { count: offerCount, error: offerCountError } = await supabase
      .from('product_offers')
      .select('*', { count: 'exact', head: true })

    // Get sample products to see what IDs were created
    const { data: sampleProducts, error: sampleError } = await supabase
      .from('products')
      .select('id, name_generic')
      .order('updated_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      imported: result.totalImported,
      stores,
      limit,
      pages,
      timestamp: new Date().toISOString(),
      database: {
        products: productCount || 0,
        offers: offerCount || 0,
        productCountError: productCountError?.message,
        offerCountError: offerCountError?.message,
        sampleProducts: sampleProducts || [],
        sampleError: sampleError?.message,
      },
    })
  } catch (error) {
    console.error('❌ Goma import failed:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}


