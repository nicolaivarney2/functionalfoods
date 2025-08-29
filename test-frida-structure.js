require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testFridaStructure() {
  try {
    console.log('🔍 Testing Frida ingredients table structure...')
    
    // Check table structure
    const { data: structure, error: structureError } = await supabase
      .from('frida_ingredients')
      .select('*')
      .limit(1)
    
    if (structureError) {
      console.error('❌ Structure error:', structureError)
      return
    }
    
    if (structure && structure.length > 0) {
      console.log('✅ Table structure:', Object.keys(structure[0]))
      console.log('📊 Sample data:', structure[0])
    }
    
    // Check for "smør" ingredients
    const { data: smorData, error: smorError } = await supabase
      .from('frida_ingredients')
      .select('*')
      .ilike('name', '%smør%')
      .limit(5)
    
    if (smorError) {
      console.error('❌ Smør search error:', smorError)
      return
    }
    
    console.log(`🔍 Found ${smorData?.length || 0} "smør" ingredients:`)
    if (smorData) {
      smorData.forEach(item => {
        console.log(`  - ${item.name} (${item.calories} kcal, ${item.protein}g protein)`)
      })
    }
    
    // Check total count
    const { count, error: countError } = await supabase
      .from('frida_ingredients')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Count error:', countError)
      return
    }
    
    console.log(`📊 Total frida_ingredients: ${count}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFridaStructure()
