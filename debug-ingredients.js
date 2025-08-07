const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugIngredients() {
  console.log('🔍 Debugging ingredients...')
  
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
    
    // Group by name to see duplicates
    const groupedByName = {}
    ingredients.forEach(ingredient => {
      const name = ingredient.name.toLowerCase().trim()
      if (!groupedByName[name]) {
        groupedByName[name] = []
      }
      groupedByName[name].push(ingredient)
    })
    
    Object.entries(groupedByName).forEach(([name, items]) => {
      console.log(`\n📝 "${name}": ${items.length} items`)
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. ID: ${item.id}`)
        console.log(`     Description: ${item.description}`)
        console.log(`     Category: ${item.category}`)
      })
    })
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

debugIngredients() 