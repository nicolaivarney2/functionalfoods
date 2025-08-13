const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function workingResetDatabase() {
  console.log('🗑️ WORKING RESET - deleting ALL recipes and ingredients...')
  
  try {
    // Step 1: Get all recipe IDs first
    console.log('🔍 Getting all recipe IDs...')
    const { data: allRecipes, error: recipesFetchError } = await supabase
      .from('recipes')
      .select('id')
    
    if (recipesFetchError) {
      console.error('❌ Error fetching recipes:', recipesFetchError)
      return
    }
    
    console.log(`📋 Found ${allRecipes.length} recipes to delete`)
    
    // Step 2: Delete recipes one by one (Supabase doesn't support delete all)
    if (allRecipes.length > 0) {
      console.log('🗑️ Deleting recipes one by one...')
      for (const recipe of allRecipes) {
        const { error } = await supabase
          .from('recipes')
          .delete()
          .eq('id', recipe.id)
        
        if (error) {
          console.error(`❌ Error deleting recipe ${recipe.id}:`, error)
        }
      }
      console.log('✅ All recipes deleted')
    }
    
    // Step 3: Get all ingredient IDs
    console.log('🔍 Getting all ingredient IDs...')
    const { data: allIngredients, error: ingredientsFetchError } = await supabase
      .from('ingredients')
      .select('id')
    
    if (ingredientsFetchError) {
      console.error('❌ Error fetching ingredients:', ingredientsFetchError)
      return
    }
    
    console.log(`📋 Found ${allIngredients.length} ingredients to delete`)
    
    // Step 4: Delete ingredients one by one
    if (allIngredients.length > 0) {
      console.log('🗑️ Deleting ingredients one by one...')
      for (const ingredient of allIngredients) {
        const { error } = await supabase
          .from('ingredients')
          .delete()
          .eq('id', ingredient.id)
        
        if (error) {
          console.error(`❌ Error deleting ingredient ${ingredient.id}:`, error)
        }
      }
      console.log('✅ All ingredients deleted')
    }
    
    // Step 5: Verify the database is empty
    console.log('🔍 Verifying database is empty...')
    
    const { data: remainingRecipes, error: recipesCheckError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1)
    
    const { data: remainingIngredients, error: ingredientsCheckError } = await supabase
      .from('ingredients')
      .select('id')
      .limit(1)
    
    if (recipesCheckError) {
      console.error('❌ Error checking recipes:', recipesCheckError)
    } else {
      console.log(`✅ Recipes table has ${remainingRecipes?.length || 0} items`)
    }
    
    if (ingredientsCheckError) {
      console.error('❌ Error checking ingredients:', ingredientsCheckError)
    } else {
      console.log(`✅ Ingredients table has ${remainingIngredients?.length || 0} items`)
    }
    
    console.log('🎉 WORKING RESET complete!')
    
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

workingResetDatabase()
