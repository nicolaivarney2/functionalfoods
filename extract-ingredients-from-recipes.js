const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function extractIngredientsFromRecipes() {
  console.log('🔍 Extracting ingredients from recipes...')
  
  try {
    // Get all recipes with a large limit
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .limit(1000) // Increase limit to get all recipes
    
    if (error) {
      console.error('❌ Error fetching recipes:', error)
      return
    }
    
    console.log(`📊 Found ${recipes.length} recipes`)
    
    // Extract all unique ingredients from recipes
    const allIngredients = new Set()
    const ingredientDetails = new Map()
    
    recipes.forEach(recipe => {
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ingredient => {
          if (ingredient.name) {
            const name = ingredient.name.toLowerCase().trim()
            allIngredients.add(name)
            
            // Store details for the first occurrence
            if (!ingredientDetails.has(name)) {
              ingredientDetails.set(name, {
                name: ingredient.name,
                category: 'andre', // Default category
                description: `${ingredient.name} - fra opskrifter`,
                exclusions: [],
                allergens: [],
                nutritionalinfo: null
              })
            }
          }
        })
      }
    })
    
    console.log(`📋 Found ${allIngredients.size} unique ingredients in recipes`)
    
    // Get existing ingredients to avoid duplicates
    const { data: existingIngredients, error: existingError } = await supabase
      .from('ingredients')
      .select('name')
      .limit(1000)
    
    if (existingError) {
      console.error('❌ Error fetching existing ingredients:', existingError)
      return
    }
    
    const existingNames = new Set(existingIngredients.map(ing => ing.name.toLowerCase()))
    
    // Filter out ingredients that already exist
    const newIngredients = []
    allIngredients.forEach(name => {
      if (!existingNames.has(name)) {
        const details = ingredientDetails.get(name)
        if (details) {
          newIngredients.push({
            id: `${name.replace(/\s+/g, '-')}-${Date.now()}`,
            ...details
          })
        }
      }
    })
    
    console.log(`✅ Will add ${newIngredients.length} new ingredients`)
    
    if (newIngredients.length > 0) {
      const { data, error: insertError } = await supabase
        .from('ingredients')
        .insert(newIngredients)
      
      if (insertError) {
        console.error('❌ Error inserting ingredients:', insertError)
        return
      }
      
      console.log('✅ Successfully added new ingredients')
      
      // Show what was added
      newIngredients.forEach(ingredient => {
        console.log(`  - ${ingredient.name}`)
      })
    } else {
      console.log('ℹ️ No new ingredients to add')
    }
    
  } catch (err) {
    console.error('❌ Error during extraction:', err)
  }
}

extractIngredientsFromRecipes() 