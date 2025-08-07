const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanDuplicatesProperly() {
  console.log('🧹 Cleaning up duplicates properly...')
  
  try {
    // Get all ingredients
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('❌ Error fetching ingredients:', error)
      return
    }
    
    console.log(`📊 Found ${ingredients.length} total ingredients`)
    
    // Group by name and keep only the first occurrence
    const seenNames = new Set()
    const toDelete = []
    
    ingredients.forEach(ingredient => {
      const name = ingredient.name.toLowerCase().trim()
      if (seenNames.has(name)) {
        toDelete.push(ingredient.id)
        console.log(`🗑️  Marking for deletion: ${ingredient.name} (${ingredient.id})`)
      } else {
        seenNames.add(name)
        console.log(`✅ Keeping: ${ingredient.name} (${ingredient.id})`)
      }
    })
    
    if (toDelete.length === 0) {
      console.log('✅ No duplicates found!')
      return
    }
    
    console.log(`🗑️  Deleting ${toDelete.length} duplicate ingredients...`)
    
    // Delete all duplicates at once
    const { error: deleteError } = await supabase
      .from('ingredients')
      .delete()
      .in('id', toDelete)
    
    if (deleteError) {
      console.error('❌ Error deleting duplicates:', deleteError)
    } else {
      console.log(`✅ Successfully deleted ${toDelete.length} duplicates!`)
    }
    
  } catch (err) {
    console.error('❌ Error cleaning duplicates:', err)
  }
}

cleanDuplicatesProperly() 