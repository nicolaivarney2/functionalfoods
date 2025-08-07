const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function resetDatabase() {
  console.log('🗑️ Resetting database - deleting all recipes and ingredients...')
  
  try {
    // Step 1: Delete all ingredients
    console.log('🗑️ Deleting all ingredients...')
    const { error: ingredientsDeleteError } = await supabase
      .from('ingredients')
      .delete()
      .neq('id', 'dummy')
    
    if (ingredientsDeleteError) {
      console.error('❌ Error deleting ingredients:', ingredientsDeleteError)
      return
    }
    
    console.log('✅ All ingredients deleted')
    
    // Step 2: Delete all recipes
    console.log('🗑️ Deleting all recipes...')
    const { error: recipesDeleteError } = await supabase
      .from('recipes')
      .delete()
      .neq('id', 'dummy')
    
    if (recipesDeleteError) {
      console.error('❌ Error deleting recipes:', recipesDeleteError)
      return
    }
    
    console.log('✅ All recipes deleted')
    
    // Step 3: Verify the database is empty
    console.log('🔍 Verifying database is empty...')
    
    const { data: remainingIngredients, error: ingredientsCheckError } = await supabase
      .from('ingredients')
      .select('count')
      .limit(1)
    
    const { data: remainingRecipes, error: recipesCheckError } = await supabase
      .from('recipes')
      .select('count')
      .limit(1)
    
    if (ingredientsCheckError) {
      console.error('❌ Error checking ingredients:', ingredientsCheckError)
    } else {
      console.log('✅ Ingredients table is empty')
    }
    
    if (recipesCheckError) {
      console.error('❌ Error checking recipes:', recipesCheckError)
    } else {
      console.log('✅ Recipes table is empty')
    }
    
    console.log('🎉 Database reset complete! Ready for fresh import.')
    
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

resetDatabase() 