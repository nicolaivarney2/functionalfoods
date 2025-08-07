const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testCurrentSchema() {
  console.log('🔍 Testing current database schema...')
  
  try {
    // Test what columns actually exist in recipes table
    const { data: recipesData, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .limit(1)
    
    if (recipesError) {
      console.error('❌ Error accessing recipes table:', recipesError)
    } else {
      console.log('✅ Recipes table accessible')
      if (recipesData && recipesData.length > 0) {
        console.log('📋 Sample recipe columns:', Object.keys(recipesData[0]))
      }
    }
    
    // Test what columns actually exist in ingredients table
    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('*')
      .limit(1)
    
    if (ingredientsError) {
      console.error('❌ Error accessing ingredients table:', ingredientsError)
    } else {
      console.log('✅ Ingredients table accessible')
      if (ingredientsData && ingredientsData.length > 0) {
        console.log('📋 Sample ingredient columns:', Object.keys(ingredientsData[0]))
      }
    }
    
  } catch (err) {
    console.error('❌ Schema test failed:', err)
  }
}

async function testBasicSave() {
  console.log('\n🧪 Testing basic save with minimal fields...')
  
  const basicRecipe = {
    id: 'test-basic-' + Date.now(),
    title: 'Test Recipe',
    description: 'Test description',
    shortDescription: 'Test short',
    preparationTime: 15,
    calories: 300,
    protein: 20,
    carbs: 10,
    fat: 15,
    fiber: 5,
    metaTitle: 'Test Meta',
    metaDescription: 'Test Meta Desc',
    keywords: ['test'],
    mainCategory: 'Test',
    subCategories: ['Test'],
    ingredients: [{ id: '1', name: 'test', amount: 100, unit: 'g' }],
    instructions: [{ id: '1', stepNumber: 1, instruction: 'Test step' }],
    imageUrl: 'test.jpg',
    imageAlt: 'Test',
    servings: 2,
    difficulty: 'Nem',
    author: 'Test'
  }
  
  try {
    const { data, error } = await supabase
      .from('recipes')
      .upsert([basicRecipe], { onConflict: 'id' })
    
    if (error) {
      console.error('❌ Basic save failed:', error)
      return false
    }
    
    console.log('✅ Basic recipe save successful!')
    return true
  } catch (err) {
    console.error('❌ Basic save exception:', err)
    return false
  }
}

async function testBasicIngredientSave() {
  console.log('\n🧪 Testing basic ingredient save...')
  
  const basicIngredient = {
    id: 'test-ingredient-basic-' + Date.now(),
    name: 'Test Ingredient',
    category: 'Test',
    description: 'Test description'
  }
  
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .upsert([basicIngredient], { onConflict: 'id' })
    
    if (error) {
      console.error('❌ Basic ingredient save failed:', error)
      return false
    }
    
    console.log('✅ Basic ingredient save successful!')
    return true
  } catch (err) {
    console.error('❌ Basic ingredient save exception:', err)
    return false
  }
}

async function runSchemaTests() {
  console.log('🚀 Starting schema analysis...\n')
  
  await testCurrentSchema()
  
  const recipeSaveOk = await testBasicSave()
  const ingredientSaveOk = await testBasicIngredientSave()
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Schema Test Summary:')
  console.log(`Basic Recipe Save: ${recipeSaveOk ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Basic Ingredient Save: ${ingredientSaveOk ? '✅ PASS' : '❌ FAIL'}`)
  
  if (recipeSaveOk && ingredientSaveOk) {
    console.log('\n🎉 Basic save functionality works! The issue is with missing columns.')
    console.log('💡 You need to run the SQL script in the Supabase dashboard to add missing columns.')
  } else {
    console.log('\n⚠️  Basic save functionality is broken.')
  }
}

runSchemaTests().catch(console.error) 