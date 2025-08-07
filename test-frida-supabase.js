const { FridaDTUMatcher } = require('./src/lib/frida-dtu-matcher.ts')

async function testFridaSupabase() {
  console.log('🧪 Testing FridaDTUMatcher with Supabase...')
  
  try {
    const fridaMatcher = new FridaDTUMatcher()
    
    // Test basic ingredient matching
    console.log('\n1️⃣ Testing basic ingredient matching...')
    const eggResult = await fridaMatcher.matchIngredient('æg')
    console.log('Æg result:', eggResult)
    
    const chickenResult = await fridaMatcher.matchIngredient('kylling')
    console.log('Kylling result:', chickenResult)
    
    // Test recipe nutrition calculation
    console.log('\n2️⃣ Testing recipe nutrition calculation...')
    const testIngredients = [
      { name: 'æg', amount: 2, unit: 'stk' },
      { name: 'kylling', amount: 200, unit: 'g' },
      { name: 'broccoli', amount: 150, unit: 'g' }
    ]
    
    const recipeNutrition = await fridaMatcher.calculateRecipeNutrition(testIngredients)
    console.log('Recipe nutrition:', recipeNutrition)
    
    console.log('✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFridaSupabase()