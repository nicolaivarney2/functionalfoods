// Test database connection and products
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testDatabase() {
  console.log('🔍 Testing database connection...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('📋 Environment variables:')
  console.log('  SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing')
  console.log('  ANON_KEY:', anonKey ? '✅ Found' : '❌ Missing')
  
  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing environment variables')
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, anonKey)
    
    console.log('🔍 Testing connection...')
    const { data, error } = await supabase
      .from('supermarket_products')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database error:', error)
      return
    }
    
    console.log('✅ Database connection successful!')
    
    // Now get actual products
    console.log('🔍 Fetching products...')
    const { data: products, error: productsError } = await supabase
      .from('supermarket_products')
      .select('id, name, category, price')
      .limit(5)
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError)
      return
    }
    
    console.log(`✅ Found ${products.length} products:`)
    products.forEach(p => console.log(`  - ${p.name} (${p.category}) - ${p.price} kr`))
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testDatabase()
