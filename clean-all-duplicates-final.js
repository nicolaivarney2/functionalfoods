const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanAllDuplicatesFinal() {
  console.log('🧹 Final cleanup - deleting all ingredients and re-adding unique ones...')
  
  try {
    // Step 1: Get all current ingredients
    const { data: allIngredients, error: fetchError } = await supabase
      .from('ingredients')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Error fetching ingredients:', fetchError)
      return
    }
    
    console.log(`📊 Found ${allIngredients.length} total ingredients`)
    
    // Step 2: Create unique ingredients map (keep first occurrence of each name)
    const uniqueIngredientsMap = new Map()
    allIngredients.forEach(ingredient => {
      const normalizedName = ingredient.name.toLowerCase().trim()
      if (!uniqueIngredientsMap.has(normalizedName)) {
        uniqueIngredientsMap.set(normalizedName, ingredient)
      }
    })
    
    const uniqueIngredients = Array.from(uniqueIngredientsMap.values())
    console.log(`📊 Found ${uniqueIngredients.length} unique ingredients`)
    
    // Step 3: Delete ALL ingredients
    console.log('🗑️ Deleting all ingredients...')
    const { error: deleteError } = await supabase
      .from('ingredients')
      .delete()
      .neq('id', 'dummy') // Delete all rows
    
    if (deleteError) {
      console.error('❌ Error deleting ingredients:', deleteError)
      return
    }
    
    console.log('✅ All ingredients deleted')
    
    // Step 4: Re-add only unique ingredients with new IDs
    console.log('➕ Re-adding unique ingredients with new IDs...')
    const ingredientsWithNewIds = uniqueIngredients.map((ingredient, index) => ({
      ...ingredient,
      id: `ingredient-${Date.now()}-${index}` // Generate new unique ID
    }))
    
    const { error: insertError } = await supabase
      .from('ingredients')
      .insert(ingredientsWithNewIds)
    
    if (insertError) {
      console.error('❌ Error inserting unique ingredients:', insertError)
      return
    }
    
    console.log(`✅ Successfully re-added ${ingredientsWithNewIds.length} unique ingredients`)
    
    // Step 5: Verify the result
    const { data: finalIngredients, error: verifyError } = await supabase
      .from('ingredients')
      .select('*')
    
    if (verifyError) {
      console.error('❌ Error verifying result:', verifyError)
      return
    }
    
    console.log(`✅ Final count: ${finalIngredients.length} ingredients`)
    
    // Show some examples
    console.log('📋 Sample ingredients:')
    finalIngredients.slice(0, 5).forEach(ingredient => {
      console.log(`  - ${ingredient.name} (${ingredient.id})`)
    })
    
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

cleanAllDuplicatesFinal() 