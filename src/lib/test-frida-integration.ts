import { FridaIntegration } from './ingredient-system/frida-integration'
import { ingredientService } from './ingredient-system'

// Test script to demonstrate Frida integration
export async function testFridaIntegration() {
  console.log('🧪 Testing Frida Integration...')
  
  const fridaIntegration = new FridaIntegration()
  
  // Test ingredients to fetch nutritional data for
  const testIngredients = [
    'kyllingebryst',
    'laks', 
    'mælk',
    'mandler',
    'broccoli',
    'spinat',
    'æble',
    'banan',
    'havregryn',
    'ris',
    'olivenolie',
    'smør'
  ]

  console.log(`📊 Testing ${testIngredients.length} ingredients...`)
  
  for (const ingredientName of testIngredients) {
    try {
      console.log(`\n🔍 Searching for: ${ingredientName}`)
      
      // Search Frida database
      const fridaData = await fridaIntegration.searchFridaIngredient(ingredientName)
      
      if (fridaData) {
        console.log(`✅ Found data for: ${ingredientName}`)
        
        // Convert to our format
        const nutritionalInfo = fridaIntegration.convertFridaToNutritionalInfo(fridaData)
        
        console.log(`📈 Nutritional data per 100g:`)
        console.log(`   Kalorier: ${nutritionalInfo.caloriesPer100g} kcal`)
        console.log(`   Protein: ${nutritionalInfo.proteinPer100g}g`)
        console.log(`   Kulhydrater: ${nutritionalInfo.carbsPer100g}g`)
        console.log(`   Fedt: ${nutritionalInfo.fatPer100g}g`)
        console.log(`   Fiber: ${nutritionalInfo.fiberPer100g}g`)
        console.log(`   Sukker: ${nutritionalInfo.sugarPer100g}g`)
        console.log(`   Natrium: ${nutritionalInfo.sodiumPer100g}mg`)
        
        if (nutritionalInfo.vitamins.length > 0) {
          console.log(`   Vitaminer: ${nutritionalInfo.vitamins.map(v => `${v.vitamin}: ${v.amountPer100g}${v.unit}`).join(', ')}`)
        }
        
        if (nutritionalInfo.minerals.length > 0) {
          console.log(`   Mineraler: ${nutritionalInfo.minerals.map(m => `${m.mineral}: ${m.amountPer100g}${m.unit}`).join(', ')}`)
        }
        
        // Determine category and exclusions
        const category = fridaIntegration.determineIngredientCategory(ingredientName, fridaData)
        const { exclusions, allergens } = fridaIntegration.determineExclusionsAndAllergens(ingredientName, category)
        
        console.log(`🏷️ Category: ${category}`)
        console.log(`❌ Exclusions: ${exclusions.join(', ') || 'None'}`)
        console.log(`⚠️ Allergens: ${allergens.join(', ') || 'None'}`)
        
      } else {
        console.log(`❌ No data found for: ${ingredientName}`)
      }
      
      // Add delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`❌ Error processing ${ingredientName}:`, error)
    }
  }
  
  console.log('\n✅ Frida integration test completed!')
}

// Test recipe calculation with real nutritional data
export async function testRecipeCalculation() {
  console.log('\n🧮 Testing Recipe Calculation...')
  
  const fridaIntegration = new FridaIntegration()
  const { RecipeCalculator } = await import('./recipe-calculator')
  const recipeCalculator = new RecipeCalculator()
  
  // Test recipe with ingredients that should have nutritional data
  const testRecipe = {
    id: 'test-1',
    title: 'Test Kyllingesalat',
    description: 'En sund salat med kylling og grøntsager',
    ingredients: [
      { name: 'kyllingebryst', amount: 200, unit: 'g' },
      { name: 'broccoli', amount: 150, unit: 'g' },
      { name: 'olivenolie', amount: 2, unit: 'spsk' },
      { name: 'mandler', amount: 30, unit: 'g' }
    ],
    instructions: ['Steg kyllingen', 'Kog broccoli', 'Bland sammen'],
    servings: 2,
    prepTime: 15,
    cookTime: 20
  }
  
  console.log(`📝 Testing recipe: ${testRecipe.title}`)
  console.log(`📊 Ingredients: ${testRecipe.ingredients.map(i => `${i.amount}${i.unit} ${i.name}`).join(', ')}`)
  
  // First, let's fetch nutritional data for the ingredients
  for (const ingredient of testRecipe.ingredients) {
    console.log(`\n🔍 Fetching data for: ${ingredient.name}`)
    const fridaData = await fridaIntegration.searchFridaIngredient(ingredient.name)
    
    if (fridaData) {
      const nutritionalInfo = fridaIntegration.convertFridaToNutritionalInfo(fridaData)
      const category = fridaIntegration.determineIngredientCategory(ingredient.name, fridaData)
      const { exclusions, allergens } = fridaIntegration.determineExclusionsAndAllergens(ingredient.name, category)
      
      // Create ingredient tag
      const ingredientTag = {
        id: ingredient.name.toLowerCase().replace(/\s+/g, '-'),
        name: ingredient.name,
        category,
        exclusions,
        allergens,
        commonNames: [ingredient.name],
        description: fridaData.description || '',
        nutritionalInfo,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Add to ingredient service
      try {
        ingredientService.createIngredientTag(ingredientTag)
        console.log(`✅ Added ${ingredient.name} with nutritional data`)
      } catch (error) {
        console.log(`⚠️ ${ingredient.name} already exists, updating...`)
        ingredientService.updateIngredientTag(ingredientTag.id, ingredientTag)
      }
    }
  }
  
  // Now calculate recipe nutrition
  console.log(`\n🧮 Calculating recipe nutrition...`)
  const calculatedNutrition = recipeCalculator.calculateRecipeNutrition(testRecipe)
  
  console.log(`📊 Recipe nutritional values per serving:`)
  console.log(`   Kalorier: ${calculatedNutrition.calories} kcal`)
  console.log(`   Protein: ${calculatedNutrition.protein}g`)
  console.log(`   Kulhydrater: ${calculatedNutrition.carbs}g`)
  console.log(`   Fedt: ${calculatedNutrition.fat}g`)
  console.log(`   Fiber: ${calculatedNutrition.fiber}g`)
  console.log(`   Sukker: ${calculatedNutrition.sugar}g`)
  console.log(`   Natrium: ${calculatedNutrition.sodium}mg`)
  
  if (calculatedNutrition.vitamins.length > 0) {
    console.log(`   Vitaminer: ${calculatedNutrition.vitamins.map(v => `${v.vitamin}: ${v.amountPer100g}${v.unit}`).join(', ')}`)
  }
  
  if (calculatedNutrition.minerals.length > 0) {
    console.log(`   Mineraler: ${calculatedNutrition.minerals.map(m => `${m.mineral}: ${m.amountPer100g}${m.unit}`).join(', ')}`)
  }
  
  console.log('\n✅ Recipe calculation test completed!')
}

// Run tests
export async function runAllTests() {
  console.log('🚀 Starting Frida Integration Tests...\n')
  
  await testFridaIntegration()
  await testRecipeCalculation()
  
  console.log('\n🎉 All tests completed!')
} 