const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function finalResetDatabase() {
  console.log('🗑️ FINAL RESET - deleting ALL recipes and ingredients...')
  
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
    
    // Step 2: Delete recipes one by one, handling empty IDs
    if (allRecipes.length > 0) {
      console.log('🗑️ Deleting recipes one by one...')
      for (const recipe of allRecipes) {
        let deleteQuery = supabase.from('recipes').delete()
        
        if (recipe.id === '' || recipe.id === null || recipe.id === undefined) {
          // Handle empty/null IDs by deleting all rows without ID
          deleteQuery = deleteQuery.is('id', null)
        } else {
          deleteQuery = deleteQuery.eq('id', recipe.id)
        }
        
        const { error } = await deleteQuery
        
        if (error) {
          console.error(`❌ Error deleting recipe ${recipe.id || 'EMPTY_ID'}:`, error)
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
    
    // Step 4: Delete ingredients one by one, handling empty IDs
    if (allIngredients.length > 0) {
      console.log('🗑️ Deleting ingredients one by one...')
      for (const ingredient of allIngredients) {
        let deleteQuery = supabase.from('ingredients').delete()
        
        if (ingredient.id === '' || ingredient.id === null || ingredient.id === undefined) {
          // Handle empty/null IDs by deleting all rows without ID
          deleteQuery = deleteQuery.is('id', null)
        } else {
          deleteQuery = deleteQuery.eq('id', ingredient.id)
        }
        
        const { error } = await deleteQuery
        
        if (error) {
          console.error(`❌ Error deleting ingredient ${ingredient.id || 'EMPTY_ID'}:`, error)
        }
      }
      console.log('✅ All ingredients deleted')
    }
    
    // Step 5: Force delete any remaining rows (nuclear option)
    console.log('💥 Force deleting any remaining rows...')
    
    // Delete all recipes without conditions
    const { error: forceRecipesDeleteError } = await supabase
      .from('recipes')
      .delete()
      .neq('id', 'THIS_WILL_NEVER_MATCH')
    
    if (forceRecipesDeleteError) {
      console.error('❌ Error force deleting recipes:', forceRecipesDeleteError)
    } else {
      console.log('✅ Force deleted all recipes')
    }
    
    // Delete all ingredients without conditions
    const { error: forceIngredientsDeleteError } = await supabase
      .from('ingredients')
      .delete()
      .neq('id', 'THIS_WILL_NEVER_MATCH')
    
    if (forceIngredientsDeleteError) {
      console.error('❌ Error force deleting ingredients:', forceIngredientsDeleteError)
    } else {
      console.log('✅ Force deleted all ingredients')
    }
    
    // Step 6: Verify the database is empty
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
    
    console.log('🎉 FINAL RESET complete!')
    
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

finalResetDatabase()
