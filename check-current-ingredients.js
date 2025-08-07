const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkCurrentIngredients() {
  console.log('🔍 Checking current ingredients in database...')
  
  try {
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('❌ Error fetching ingredients:', error)
      return
    }
    
    console.log(`📊 Found ${ingredients.length} ingredients:`)
    ingredients.forEach((ingredient, index) => {
      console.log(`  ${index + 1}. ${ingredient.name} (ID: ${ingredient.id})`)
    })
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

checkCurrentIngredients() 