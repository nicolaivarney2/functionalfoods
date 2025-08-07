const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function extractIngredientsFromAPI() {
  console.log('🔍 Extracting ingredients from recipes via API...')
  
  try {
    // Get all recipes via API
    const response = await fetch('http://localhost:3000/api/recipes')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const recipes = await response.json()
    console.log(`📊 Found ${recipes.length} recipes via API`)
    
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
    
    // Get existing ingredients via API
    const ingredientsResponse = await fetch('http://localhost:3000/api/ingredients')
    if (!ingredientsResponse.ok) {
      throw new Error(`HTTP error! status: ${ingredientsResponse.status}`)
    }
    
    const existingIngredients = await ingredientsResponse.json()
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
      // Send ingredients in batches of 10
      const batchSize = 10
      for (let i = 0; i < newIngredients.length; i += batchSize) {
        const batch = newIngredients.slice(i, i + batchSize)
        
        console.log(`📦 Sending batch ${Math.floor(i/batchSize) + 1} (${batch.length} ingredients)...`)
        
        const addResponse = await fetch('http://localhost:3000/api/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch)
        })
        
        if (!addResponse.ok) {
          const errorText = await addResponse.text()
          throw new Error(`HTTP error! status: ${addResponse.status}, body: ${errorText}`)
        }
        
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} saved successfully`)
        
        // Show what was added in this batch
        batch.forEach(ingredient => {
          console.log(`  - ${ingredient.name}`)
        })
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log('✅ All ingredients added successfully')
    } else {
      console.log('ℹ️ No new ingredients to add')
    }
    
  } catch (err) {
    console.error('❌ Error during extraction:', err)
  }
}

extractIngredientsFromAPI() 