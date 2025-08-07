const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function deleteAllDuplicates() {
  console.log('🧹 Deleting all duplicates...')
  
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
    
    // Keep only the first occurrence of each name
    const seenNames = new Set()
    const toKeep = []
    const toDelete = []
    
    ingredients.forEach(ingredient => {
      const name = ingredient.name.toLowerCase().trim()
      if (seenNames.has(name)) {
        toDelete.push(ingredient.id)
        console.log(`🗑️  Marking for deletion: ${ingredient.name} (${ingredient.id})`)
      } else {
        seenNames.add(name)
        toKeep.push(ingredient.id)
        console.log(`✅ Keeping: ${ingredient.name} (${ingredient.id})`)
      }
    })
    
    console.log(`\n📊 Summary:`)
    console.log(`✅ Keeping: ${toKeep.length} ingredients`)
    console.log(`🗑️  Deleting: ${toDelete.length} ingredients`)
    
    // Delete all duplicates
    if (toDelete.length > 0) {
      console.log(`\n🗑️  Deleting ${toDelete.length} duplicates...`)
      
      for (const id of toDelete) {
        console.log(`🗑️  Deleting: ${id}`)
        
        const { error: deleteError } = await supabase
          .from('ingredients')
          .delete()
          .eq('id', id)
        
        if (deleteError) {
          console.error(`❌ Error deleting ${id}:`, deleteError)
        } else {
          console.log(`✅ Successfully deleted ${id}`)
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    console.log('\n✅ Deletion complete!')
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

deleteAllDuplicates() 