const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanDuplicateIngredients() {
  console.log('🧹 Cleaning up duplicate ingredients...')
  
  try {
    // Get all ingredients
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('*')
    
    if (error) {
      console.error('❌ Error fetching ingredients:', error)
      return
    }
    
    console.log(`📊 Found ${ingredients.length} total ingredients`)
    
    // Group by name to find duplicates
    const groupedByName = {}
    ingredients.forEach(ingredient => {
      const name = ingredient.name.toLowerCase().trim()
      if (!groupedByName[name]) {
        groupedByName[name] = []
      }
      groupedByName[name].push(ingredient)
    })
    
    // Find duplicates
    const duplicates = []
    const toKeep = []
    
    Object.entries(groupedByName).forEach(([name, items]) => {
      if (items.length > 1) {
        console.log(`🔍 Found ${items.length} duplicates for "${name}":`)
        items.forEach(item => {
          console.log(`  - ID: ${item.id}, Description: ${item.description}`)
        })
        
        // Keep the first one, mark others for deletion
        toKeep.push(items[0])
        duplicates.push(...items.slice(1))
      } else {
        toKeep.push(items[0])
      }
    })
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!')
      return
    }
    
    console.log(`🗑️  Found ${duplicates.length} duplicate ingredients to delete`)
    
    // Delete duplicates
    for (const duplicate of duplicates) {
      const { error: deleteError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', duplicate.id)
      
      if (deleteError) {
        console.error(`❌ Error deleting ${duplicate.id}:`, deleteError)
      } else {
        console.log(`✅ Deleted duplicate: ${duplicate.name} (${duplicate.id})`)
      }
    }
    
    console.log(`✅ Cleanup complete! Kept ${toKeep.length} unique ingredients`)
    
  } catch (err) {
    console.error('❌ Error cleaning duplicates:', err)
  }
}

cleanDuplicateIngredients() 