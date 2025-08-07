const { createClient } = require('@supabase/supabase-js')

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Frida connection...')
  
  try {
    // Hardcode credentials for quick test
    const supabase = createClient(
      'https://vfzagjjcltqtqkgqcfrn.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmemFnampsY3R0cWdrZ3FjZnJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MjA1MzcsImV4cCI6MjA1MjI5NjUzN30.R7c_5OxjxM-YkuCCrqCyDZGdtN02vFpPP9g3-1VxAcg'
    )
    
    console.log('✅ Supabase client created')
    
    // Test 1: Check frida_foods table
    console.log('\n1️⃣ Testing frida_foods table...')
    const { data: foods, error: foodsError } = await supabase
      .from('frida_foods')
      .select('food_id, food_name_da')
      .limit(5)
    
    if (foodsError) {
      console.error('❌ Foods error:', foodsError)
    } else {
      console.log('✅ Sample foods:', foods)
    }
    
    // Test 2: Check frida_nutrition_values table
    console.log('\n2️⃣ Testing frida_nutrition_values table...')
    const { data: nutrition, error: nutritionError } = await supabase
      .from('frida_nutrition_values')
      .select('food_id, parameter_name_da, value')
      .limit(5)
    
    if (nutritionError) {
      console.error('❌ Nutrition error:', nutritionError)
    } else {
      console.log('✅ Sample nutrition values:', nutrition)
    }
    
    // Test 3: Search for "æg"
    console.log('\n3️⃣ Testing search for "æg"...')
    const { data: eggSearch, error: eggError } = await supabase
      .from('frida_foods')
      .select('food_id, food_name_da')
      .ilike('food_name_da', '%æg%')
      .limit(3)
    
    if (eggError) {
      console.error('❌ Egg search error:', eggError)
    } else {
      console.log('✅ Egg search results:', eggSearch)
      
      // If we found an egg, get its nutrition
      if (eggSearch && eggSearch.length > 0) {
        const eggFoodId = eggSearch[0].food_id
        console.log(`\n4️⃣ Getting nutrition for food_id ${eggFoodId}...`)
        
        const { data: eggNutrition, error: eggNutritionError } = await supabase
          .from('frida_nutrition_values')
          .select('parameter_name_da, value')
          .eq('food_id', eggFoodId)
          .in('parameter_name_da', ['Energi (kcal)', 'Protein', 'Fedt', 'Kulhydrat difference'])
        
        if (eggNutritionError) {
          console.error('❌ Egg nutrition error:', eggNutritionError)
        } else {
          console.log('✅ Egg nutrition:', eggNutrition)
        }
      }
    }
    
    console.log('\n🎉 All tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSupabaseConnection()