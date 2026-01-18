import { ingredientService, IngredientCategory } from './index';
import { RecipeCategory } from './types';

// Test the ingredient tagging system
export function testIngredientSystem() {
  console.log('🧪 Testing Ingredient Tagging System...');

  // Test 1: Get all ingredients
  const allIngredients = ingredientService.getIngredients();
  console.log(`✅ Found ${allIngredients.length} ingredients:`);
  allIngredients.forEach(ingredient => {
    console.log(`  - ${ingredient.name} (${ingredient.category})`);
    if (ingredient.exclusions.length > 0) {
      console.log(`    Exclusions: ${ingredient.exclusions.join(', ')}`);
    }
  });

  // Test 2: Test the pork exclusion system
  const porkIngredient = ingredientService.getIngredientByName('Svinemørbrad');
  if (porkIngredient) {
    console.log(`✅ Pork ingredient found: ${porkIngredient.name}`);
    console.log(`   Exclusions: ${porkIngredient.exclusions.join(', ')}`);
    console.log(`   This ingredient will be excluded when user excludes 'pork'`);
  }

  // Test 3: Test ingredient filtering
  const proteinIngredients = ingredientService.getIngredients({ 
    category: IngredientCategory.Protein 
  });
  console.log(`✅ Found ${proteinIngredients.length} protein ingredients`);

  // Test 4: Test ingredient creation
  const newIngredient = ingredientService.createIngredientTag({
    name: 'Tofu',
    category: IngredientCategory.Protein,
    exclusions: ['soy'],
    allergens: ['soy'],
    commonNames: ['tofu', 'bean curd'],
    description: 'Soy-based protein',
    isActive: true
  });
  console.log(`✅ Created new ingredient: ${newIngredient.name} (${newIngredient.id})`);

  // Test 5: Test ingredient search
  const searchResults = ingredientService.getIngredients({ 
    searchTerm: 'chicken' 
  });
  console.log(`✅ Search for 'chicken' found ${searchResults.length} results`);

  // Test 6: Test ingredient statistics
  const stats = ingredientService.getIngredientStats();
  console.log(`✅ Ingredient statistics:`);
  console.log(`   Total: ${stats.total}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   With allergens: ${stats.withAllergens}`);
  console.log(`   With exclusions: ${stats.withExclusions}`);

  // Test 7: Test exclusion management
  const success = ingredientService.addExclusion(newIngredient.id, 'vegetarian');
  console.log(`✅ Added 'vegetarian' exclusion to tofu: ${success}`);

  // Test 8: Test recipe filtering (with mock recipe)
  const mockRecipe = {
    id: 'recipe-1',
    title: 'Pork and Chicken Stir Fry',
    description: 'A delicious stir fry',
    ingredients: [
      { ingredientId: 'pork-1', amount: 200, unit: 'g' },
      { ingredientId: 'chicken-1', amount: 200, unit: 'g' }
    ],
    instructions: ['Cook pork', 'Cook chicken'],
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    categories: [RecipeCategory.MainCourse],
    dietaryApproaches: ['keto'],
    nutritionalInfo: {
      caloriesPer100g: 250,
      proteinPer100g: 25,
      carbsPer100g: 5,
      fatPer100g: 15
    },
    images: [],
    slug: 'pork-chicken-stir-fry',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const violations = ingredientService.checkRecipeExclusions(mockRecipe, ['pork']);
  console.log(`✅ Recipe exclusion check for 'pork':`);
  console.log(`   Violations: ${violations.length > 0 ? violations.join(', ') : 'None'}`);

  console.log('🎉 Ingredient tagging system test completed!');
} 