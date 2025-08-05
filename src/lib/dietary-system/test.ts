import { dietaryFactory, DietaryCalculator, UserProfile, ActivityLevel, WeightGoal } from './index';

// Test the dietary system
export function testDietarySystem() {
  console.log('🧪 Testing Dietary System...');

  // Test 1: Get all dietary approaches
  const allDiets = dietaryFactory.getAllDiets();
  console.log(`✅ Found ${allDiets.length} dietary approaches:`);
  allDiets.forEach(diet => {
    console.log(`  - ${diet.name} (${diet.id})`);
  });

  // Test 2: Get specific diet
  const keto = dietaryFactory.getDiet('keto');
  if (keto) {
    console.log(`✅ Keto diet loaded: ${keto.name}`);
    console.log(`   Macros: ${keto.macroRatios.carbohydrates.target}% carbs, ${keto.macroRatios.protein.target}% protein, ${keto.macroRatios.fat.target}% fat`);
  }

  // Test 3: Calculate energy needs
  const testProfile: UserProfile = {
    gender: 'male',
    age: 30,
    height: 175,
    weight: 70,
    activityLevel: ActivityLevel.ModeratelyActive,
    goal: WeightGoal.WeightLoss
  };

  const energyNeeds = DietaryCalculator.calculateTargetCalories(testProfile);
  console.log(`✅ Energy calculation for test profile:`);
  console.log(`   BMR: ${energyNeeds.bmr} calories`);
  console.log(`   TDEE: ${energyNeeds.tdee} calories`);
  console.log(`   Target: ${energyNeeds.targetCalories} calories`);
  console.log(`   Deficit: ${energyNeeds.deficit} calories`);

  // Test 4: Calculate macro targets
  if (keto) {
    const macroTargets = DietaryCalculator.calculateDietaryMacroTargets(testProfile, keto);
    console.log(`✅ Macro targets for keto:`);
    console.log(`   Protein: ${macroTargets.protein}g (${macroTargets.proteinPercentage}%)`);
    console.log(`   Carbs: ${macroTargets.carbohydrates}g (${macroTargets.carbPercentage}%)`);
    console.log(`   Fat: ${macroTargets.fat}g (${macroTargets.fatPercentage}%)`);
  }

  // Test 5: Validate macro ratios
  allDiets.forEach(diet => {
    const isValid = DietaryCalculator.validateMacroRatios(diet.macroRatios);
    console.log(`✅ ${diet.name} macro validation: ${isValid ? 'PASS' : 'FAIL'}`);
  });

  console.log('🎉 Dietary system test completed!');
} 