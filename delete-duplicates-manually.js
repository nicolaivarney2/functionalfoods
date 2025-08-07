const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function deleteDuplicatesManually() {
  console.log('🧹 Deleting duplicates manually...')
  
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
      } else {
        seenNames.add(name)
      }
    })
    
    console.log(`🗑️  Found ${toDelete.length} duplicates to delete`)
    
    // Delete one by one
    for (const id of toDelete) {
      console.log(`🗑️  Deleting ingredient with ID: ${id}`)
      
      const { error: deleteError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        console.error(`❌ Error deleting ${id}:`, deleteError)
      } else {
        console.log(`✅ Successfully deleted ${id}`)
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('✅ Manual deletion complete!')
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

deleteDuplicatesManually() 