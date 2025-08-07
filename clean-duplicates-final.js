const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanDuplicatesFinal() {
  console.log('🧹 Final cleanup of duplicates...')
  
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
    const toKeep = []
    const toDelete = []
    
    ingredients.forEach(ingredient => {
      const name = ingredient.name.toLowerCase().trim()
      if (!seenNames.has(name)) {
        seenNames.add(name)
        toKeep.push(ingredient)
      } else {
        toDelete.push(ingredient.id)
      }
    })
    
    console.log(`✅ Will keep ${toKeep.length} unique ingredients`)
    console.log(`🗑️ Will delete ${toDelete.length} duplicates`)
    
    // Delete all duplicates
    if (toDelete.length > 0) {
      console.log('🗑️ Deleting duplicates...')
      for (const id of toDelete) {
        const { error: deleteError } = await supabase
          .from('ingredients')
          .delete()
          .eq('id', id)
        
        if (deleteError) {
          console.error(`❌ Error deleting ${id}:`, deleteError)
        } else {
          console.log(`✅ Deleted ${id}`)
        }
      }
    }
    
    console.log('✅ Cleanup complete!')
    
  } catch (err) {
    console.error('❌ Error during cleanup:', err)
  }
}

cleanDuplicatesFinal() 