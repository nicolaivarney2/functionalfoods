import { 
  MealPlan, 
  WeekPlan, 
  DayPlan, 
  MealAssignment, 
  MealType, 
  MealPlanConfig,
  RecipeScore,
  RecipeCompatibility,
  MealPlanValidation,
  ValidationError,
  ValidationWarning,
  ShoppingList,
  ShoppingCategory,
  ShoppingItem,
  WeeklyNutrition,
  NutritionGoals,
  NutritionalDeficiency,
  DifficultyLevel,
  MealPlanStatus
} from './types';

import { RecipeCategory } from '../ingredient-system';

import { 
  UserProfile, 
  DietaryApproach, 
  MacroTargets, 
  EnergyNeeds,
  DietaryCalculator,
  dietaryFactory
} from '../dietary-system';

import { 
  Recipe, 
  RecipeFilter, 
  ingredientService 
} from '../ingredient-system';

export class MealPlanGenerator {
  private recipes: Recipe[] = [];
  private usedRecipes: Set<string> = new Set();

  constructor() {
    this.initializeSampleRecipes();
  }

  /**
   * Initialize with sample recipes for testing
   */
  private initializeSampleRecipes(): void {
    this.recipes = [
      {
        id: 'keto-breakfast-1',
        title: 'Keto Avocado & Egg Bowl',
        description: 'A satisfying keto breakfast with healthy fats',
        ingredients: [
          { ingredientId: 'avocado-1', amount: 1, unit: 'piece' },
          { ingredientId: 'egg-1', amount: 2, unit: 'pieces' },
          { ingredientId: 'olive-oil-1', amount: 1, unit: 'tbsp' }
        ],
        instructions: [
          'Fry eggs in olive oil',
          'Slice avocado',
          'Combine in bowl'
        ],
        prepTime: 5,
        cookTime: 10,
        servings: 1,
        categories: [RecipeCategory.Breakfast],
        dietaryApproaches: ['keto'],
        nutritionalInfo: {
          caloriesPer100g: 320,
          proteinPer100g: 15,
          carbsPer100g: 8,
          fatPer100g: 28
        },
        images: ['/images/recipes/keto-avocado-egg-bowl.jpg'],
        slug: 'keto-avocado-egg-bowl',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'keto-lunch-1',
        title: 'Keto Chicken Salad',
        description: 'High-protein lunch with mixed greens',
        ingredients: [
          { ingredientId: 'chicken-1', amount: 150, unit: 'g' },
          { ingredientId: 'lettuce-1', amount: 50, unit: 'g' },
          { ingredientId: 'olive-oil-1', amount: 2, unit: 'tbsp' }
        ],
        instructions: [
          'Grill chicken breast',
          'Chop lettuce',
          'Mix with olive oil dressing'
        ],
        prepTime: 15,
        cookTime: 20,
        servings: 1,
        categories: [RecipeCategory.Lunch],
        dietaryApproaches: ['keto'],
        nutritionalInfo: {
          caloriesPer100g: 280,
          proteinPer100g: 25,
          carbsPer100g: 5,
          fatPer100g: 18
        },
        images: ['/images/recipes/keto-chicken-salad.jpg'],
        slug: 'keto-chicken-salad',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'keto-dinner-1',
        title: 'Keto Salmon with Vegetables',
        description: 'Omega-3 rich dinner with low-carb vegetables',
        ingredients: [
          { ingredientId: 'salmon-1', amount: 200, unit: 'g' },
          { ingredientId: 'broccoli-1', amount: 100, unit: 'g' },
          { ingredientId: 'butter-1', amount: 1, unit: 'tbsp' }
        ],
        instructions: [
          'Bake salmon in oven',
          'Steam broccoli',
          'Serve with butter'
        ],
        prepTime: 10,
        cookTime: 25,
        servings: 1,
        categories: [RecipeCategory.Dinner],
        dietaryApproaches: ['keto'],
        nutritionalInfo: {
          caloriesPer100g: 350,
          proteinPer100g: 30,
          carbsPer100g: 8,
          fatPer100g: 22
        },
        images: ['/images/recipes/keto-salmon-vegetables.jpg'],
        slug: 'keto-salmon-vegetables',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'keto-snack-1',
        title: 'Keto Nuts & Seeds Mix',
        description: 'Healthy fat snack for keto diet',
        ingredients: [
          { ingredientId: 'almond-1', amount: 30, unit: 'g' },
          { ingredientId: 'walnut-1', amount: 20, unit: 'g' },
          { ingredientId: 'pumpkin-seed-1', amount: 15, unit: 'g' }
        ],
        instructions: [
          'Mix nuts and seeds',
          'Portion into snack size'
        ],
        prepTime: 5,
        cookTime: 0,
        servings: 1,
        categories: [RecipeCategory.Snack],
        dietaryApproaches: ['keto'],
        nutritionalInfo: {
          caloriesPer100g: 580,
          proteinPer100g: 18,
          carbsPer100g: 12,
          fatPer100g: 52
        },
        images: ['/images/recipes/keto-nuts-seeds-mix.jpg'],
        slug: 'keto-nuts-seeds-mix',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  /**
   * Generate a complete 6-week meal plan
   */
  async generateMealPlan(
    userId: string,
    userProfile: UserProfile,
    dietaryApproachId: string,
    excludedIngredients: string[],
    allergies: string[],
    nutritionalAssessment: any
  ): Promise<MealPlan> {
    const startTime = Date.now();

    // Get dietary approach
    const dietaryApproach = dietaryFactory.getDiet(dietaryApproachId);
    if (!dietaryApproach) {
      throw new Error(`Dietary approach ${dietaryApproachId} not found`);
    }

    // Calculate energy needs and macro targets
    const energyNeeds = DietaryCalculator.calculateTargetCalories(userProfile);
    const macroTargets = DietaryCalculator.calculateDietaryMacroTargets(userProfile, dietaryApproach);

    // Create meal plan configuration
    const config: MealPlanConfig = {
      targetCalories: energyNeeds.targetCalories,
      macroTargets,
      dietaryApproach,
      excludedIngredients,
      excludedCategories: [],
      allergies,
      intolerances: [],
      mealStructure: this.createMealStructure(dietaryApproach),
      varietyPreferences: {
        maxRepeatDays: 2,
        preferredCuisines: [],
        avoidCuisines: [],
        seasonalPreferences: []
      },
      difficultyLevel: DifficultyLevel.Medium,
      timeConstraints: {
        maxPrepTime: 30,
        maxCookTime: 60,
        preferredCookingDays: ['monday', 'wednesday', 'friday'],
        batchCookingAllowed: true
      }
    };

    // Generate 6 weeks of meal plans
    const weeks: WeekPlan[] = [];
    for (let weekNumber = 1; weekNumber <= 6; weekNumber++) {
      const weekPlan = await this.generateWeekPlan(weekNumber, config);
      weeks.push(weekPlan);
    }

    // Create the complete meal plan
    const mealPlan: MealPlan = {
      id: this.generateMealPlanId(),
      userId,
      userProfile,
      dietaryApproach,
      energyNeeds,
      macroTargets,
      weeks,
      excludedIngredients,
      excludedCategories: [],
      allergies,
      intolerances: [],
      nutritionalAssessment,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: MealPlanStatus.Generated
    };

    // Validate the meal plan
    const validation = this.validateMealPlan(mealPlan);
    if (!validation.isValid) {
      console.warn('Meal plan validation warnings:', validation.warnings);
    }

    console.log(`Meal plan generated in ${Date.now() - startTime}ms`);
    return mealPlan;
  }

  /**
   * Generate a single week of meal plans
   */
  private async generateWeekPlan(weekNumber: number, config: MealPlanConfig): Promise<WeekPlan> {
    const days: DayPlan[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + dayIndex);
      
      const dayPlan = await this.generateDayPlan(date, config);
      days.push(dayPlan);
    }

    // Generate shopping list for the week
    const shoppingList = this.generateShoppingList(weekNumber, days);

    // Calculate weekly nutrition
    const weeklyNutrition = this.calculateWeeklyNutrition(days, config);

    return {
      weekNumber,
      days,
      shoppingList,
      weeklyNutrition
    };
  }

  /**
   * Generate a single day of meals
   */
  private async generateDayPlan(date: Date, config: MealPlanConfig): Promise<DayPlan> {
    const meals: MealAssignment[] = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Generate meals for each meal type
    for (const mealDistribution of config.mealStructure.mealDistribution) {
      const meal = await this.generateMeal(mealDistribution, config, date);
      meals.push(meal);

      totalCalories += meal.adjustedCalories;
      totalProtein += meal.adjustedProtein;
      totalCarbs += meal.adjustedCarbs;
      totalFat += meal.adjustedFat;
    }

    return {
      date,
      meals,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat
    };
  }

  /**
   * Generate a single meal
   */
  private async generateMeal(
    mealDistribution: any,
    config: MealPlanConfig,
    date: Date
  ): Promise<MealAssignment> {
    // Filter recipes based on dietary approach and exclusions
    const availableRecipes = this.filterRecipes(config);
    
    // Score and rank recipes
    const scoredRecipes = this.scoreRecipes(availableRecipes, mealDistribution, config);
    
    // Select the best recipe
    const selectedRecipe = this.selectRecipe(scoredRecipes, date);
    
    // Calculate servings to meet macro targets
    const servings = this.calculateServings(selectedRecipe, mealDistribution);
    
    // Calculate adjusted nutritional values
    const adjustedValues = this.calculateAdjustedNutrition(selectedRecipe, servings);

    return {
      mealType: mealDistribution.mealType,
      recipe: selectedRecipe,
      servings,
      adjustedCalories: adjustedValues.calories,
      adjustedProtein: adjustedValues.protein,
      adjustedCarbs: adjustedValues.carbs,
      adjustedFat: adjustedValues.fat
    };
  }

  /**
   * Filter recipes based on dietary approach and exclusions
   */
  private filterRecipes(config: MealPlanConfig): Recipe[] {
    return this.recipes.filter(recipe => {
      // Check dietary approach compatibility
      if (!recipe.dietaryApproaches.includes(config.dietaryApproach.id)) {
        return false;
      }

      // Check for excluded ingredients
      const violations = ingredientService.checkRecipeExclusions(recipe, config.excludedIngredients);
      if (violations.length > 0) {
        return false;
      }

      // Check for allergies
      for (const allergy of config.allergies) {
        const hasAllergy = recipe.ingredients.some(ingredient => {
          const ingredientData = ingredientService.getIngredientById(ingredient.ingredientId);
          return ingredientData?.allergens.includes(allergy);
        });
        if (hasAllergy) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Score recipes based on compatibility and preferences
   */
  private scoreRecipes(
    recipes: Recipe[], 
    mealDistribution: any, 
    config: MealPlanConfig
  ): RecipeScore[] {
    return recipes.map(recipe => {
      const compatibility = this.calculateRecipeCompatibility(recipe, mealDistribution, config);
      const score = this.calculateOverallScore(compatibility);
      
      return {
        recipe,
        score,
        reasons: this.generateScoreReasons(compatibility),
        compatibility
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate recipe compatibility
   */
  private calculateRecipeCompatibility(
    recipe: Recipe, 
    mealDistribution: any, 
    config: MealPlanConfig
  ): RecipeCompatibility {
    // Macro alignment (0-100)
    const macroAlignment = this.calculateMacroAlignment(recipe, mealDistribution);
    
    // Ingredient compatibility (0-100)
    const ingredientCompatibility = this.calculateIngredientCompatibility(recipe, config);
    
    // Time compatibility (0-100)
    const timeCompatibility = this.calculateTimeCompatibility(recipe, config);
    
    // Variety score (0-100)
    const varietyScore = this.calculateVarietyScore(recipe);

    // Overall score
    const overallScore = (macroAlignment + ingredientCompatibility + timeCompatibility + varietyScore) / 4;

    return {
      macroAlignment,
      ingredientCompatibility,
      timeCompatibility,
      varietyScore,
      overallScore
    };
  }

  /**
   * Calculate macro alignment score
   */
  private calculateMacroAlignment(recipe: Recipe, mealDistribution: any): number {
    const recipeCalories = recipe.nutritionalInfo.caloriesPer100g;
    const recipeProtein = recipe.nutritionalInfo.proteinPer100g;
    const recipeCarbs = recipe.nutritionalInfo.carbsPer100g;
    const recipeFat = recipe.nutritionalInfo.fatPer100g;

    const targetCalories = mealDistribution.targetCalories;
    const targetProtein = mealDistribution.targetProtein;
    const targetCarbs = mealDistribution.targetCarbs;
    const targetFat = mealDistribution.targetFat;

    // Calculate alignment scores
    const calorieAlignment = Math.max(0, 100 - Math.abs(recipeCalories - targetCalories) / targetCalories * 100);
    const proteinAlignment = Math.max(0, 100 - Math.abs(recipeProtein - targetProtein) / targetProtein * 100);
    const carbAlignment = Math.max(0, 100 - Math.abs(recipeCarbs - targetCarbs) / targetCarbs * 100);
    const fatAlignment = Math.max(0, 100 - Math.abs(recipeFat - targetFat) / targetFat * 100);

    return (calorieAlignment + proteinAlignment + carbAlignment + fatAlignment) / 4;
  }

  /**
   * Calculate ingredient compatibility score
   */
  private calculateIngredientCompatibility(recipe: Recipe, config: MealPlanConfig): number {
    let score = 100;

    // Penalty for excluded ingredients
    const violations = ingredientService.checkRecipeExclusions(recipe, config.excludedIngredients);
    score -= violations.length * 20;

    // Bonus for preferred ingredients (if any)
    // This could be expanded based on user preferences

    return Math.max(0, score);
  }

  /**
   * Calculate time compatibility score
   */
  private calculateTimeCompatibility(recipe: Recipe, config: MealPlanConfig): number {
    const totalTime = recipe.prepTime + recipe.cookTime;
    const maxTime = config.timeConstraints.maxPrepTime + config.timeConstraints.maxCookTime;

    if (totalTime <= maxTime) {
      return 100 - (totalTime / maxTime) * 50; // Higher score for faster recipes
    } else {
      return Math.max(0, 100 - (totalTime - maxTime) / maxTime * 100);
    }
  }

  /**
   * Calculate variety score
   */
  private calculateVarietyScore(recipe: Recipe): number {
    // Penalty for recently used recipes
    if (this.usedRecipes.has(recipe.id)) {
      return 50; // Reduced score for used recipes
    }
    return 100;
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(compatibility: RecipeCompatibility): number {
    return compatibility.overallScore;
  }

  /**
   * Generate score reasons
   */
  private generateScoreReasons(compatibility: RecipeCompatibility): string[] {
    const reasons: string[] = [];

    if (compatibility.macroAlignment > 80) reasons.push('Excellent macro balance');
    if (compatibility.ingredientCompatibility > 80) reasons.push('Great ingredient compatibility');
    if (compatibility.timeCompatibility > 80) reasons.push('Quick and easy to prepare');
    if (compatibility.varietyScore > 80) reasons.push('Good variety choice');

    return reasons;
  }

  /**
   * Select the best recipe
   */
  private selectRecipe(scoredRecipes: RecipeScore[], date: Date): Recipe {
    if (scoredRecipes.length === 0) {
      throw new Error('No suitable recipes found');
    }

    // For now, select the highest scoring recipe
    const selectedRecipe = scoredRecipes[0].recipe;
    this.usedRecipes.add(selectedRecipe.id);

    return selectedRecipe;
  }

  /**
   * Calculate servings to meet macro targets
   */
  private calculateServings(recipe: Recipe, mealDistribution: any): number {
    const targetCalories = mealDistribution.targetCalories;
    const recipeCalories = recipe.nutritionalInfo.caloriesPer100g;
    
    // Calculate servings based on calories
    const servings = targetCalories / recipeCalories;
    
    // Round to reasonable serving sizes
    return Math.max(0.5, Math.min(3, Math.round(servings * 10) / 10));
  }

  /**
   * Calculate adjusted nutritional values
   */
  private calculateAdjustedNutrition(recipe: Recipe, servings: number): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    const multiplier = servings / recipe.servings;
    
    return {
      calories: recipe.nutritionalInfo.caloriesPer100g * multiplier,
      protein: recipe.nutritionalInfo.proteinPer100g * multiplier,
      carbs: recipe.nutritionalInfo.carbsPer100g * multiplier,
      fat: recipe.nutritionalInfo.fatPer100g * multiplier
    };
  }

  /**
   * Create meal structure based on dietary approach
   */
  private createMealStructure(dietaryApproach: DietaryApproach): any {
    const mealsPerDay = dietaryApproach.mealStructure.mealsPerDay;
    const mealDistribution = dietaryApproach.mealStructure.mealDistribution;

    return {
      mealsPerDay,
      mealDistribution: mealDistribution.map((meal: any) => ({
        mealType: meal.mealType,
        targetCalories: meal.portionSize.amount,
        targetProtein: (meal.macroDistribution.protein.target / 100) * meal.portionSize.amount / 4, // 4 cal/g protein
        targetCarbs: (meal.macroDistribution.carbohydrates.target / 100) * meal.portionSize.amount / 4, // 4 cal/g carbs
        targetFat: (meal.macroDistribution.fat.target / 100) * meal.portionSize.amount / 9, // 9 cal/g fat
        timeRange: meal.timeOfDay
      })),
      snacksAllowed: dietaryApproach.mealStructure.snacksAllowed,
      fastingDays: dietaryApproach.mealStructure.fastingPeriods?.map((period: any) => period.daysPerWeek),
      optionalBreakfast: dietaryApproach.mealStructure.optionalBreakfast
    };
  }

  /**
   * Generate shopping list for a week
   */
  private generateShoppingList(weekNumber: number, days: DayPlan[]): ShoppingList {
    const ingredientMap = new Map<string, { amount: number; unit: string }>();

    // Aggregate ingredients from all meals
    days.forEach(day => {
      day.meals.forEach(meal => {
        meal.recipe.ingredients.forEach(ingredient => {
          const key = ingredient.ingredientId;
          const current = ingredientMap.get(key) || { amount: 0, unit: ingredient.unit };
          
          ingredientMap.set(key, {
            amount: current.amount + (ingredient.amount * meal.servings),
            unit: ingredient.unit
          });
        });
      });
    });

    // Convert to shopping categories
    const categories: ShoppingCategory[] = [];
    const proteinItems: ShoppingItem[] = [];
    const vegetableItems: ShoppingItem[] = [];
    const otherItems: ShoppingItem[] = [];

    ingredientMap.forEach((value, ingredientId) => {
      const ingredient = ingredientService.getIngredientById(ingredientId);
      const item: ShoppingItem = {
        name: ingredient?.name || ingredientId,
        amount: value.amount,
        unit: value.unit
      };

      if (ingredient?.category === 'protein') {
        proteinItems.push(item);
      } else if (ingredient?.category === 'vegetable') {
        vegetableItems.push(item);
      } else {
        otherItems.push(item);
      }
    });

    if (proteinItems.length > 0) {
      categories.push({ name: 'Protein', items: proteinItems });
    }
    if (vegetableItems.length > 0) {
      categories.push({ name: 'Vegetables', items: vegetableItems });
    }
    if (otherItems.length > 0) {
      categories.push({ name: 'Other', items: otherItems });
    }

    return {
      weekNumber,
      categories
    };
  }

  /**
   * Calculate weekly nutrition
   */
  private calculateWeeklyNutrition(days: DayPlan[], config: MealPlanConfig): WeeklyNutrition {
    const totalCalories = days.reduce((sum, day) => sum + day.totalCalories, 0);
    const totalProtein = days.reduce((sum, day) => sum + day.totalProtein, 0);
    const totalCarbs = days.reduce((sum, day) => sum + day.totalCarbs, 0);
    const totalFat = days.reduce((sum, day) => sum + day.totalFat, 0);

    const averageDailyCalories = totalCalories / 7;
    const averageDailyProtein = totalProtein / 7;
    const averageDailyCarbs = totalCarbs / 7;
    const averageDailyFat = totalFat / 7;

    const nutritionGoals: NutritionGoals = {
      targetCalories: config.targetCalories,
      targetProtein: config.macroTargets.protein.target,
      targetCarbs: config.macroTargets.carbohydrates.target,
      targetFat: config.macroTargets.fat.target
    };

    // Calculate deficiencies
    const deficiencies: NutritionalDeficiency[] = [];
    
    if (averageDailyProtein < nutritionGoals.targetProtein * 0.9) {
      deficiencies.push({
        nutrient: 'Protein',
        currentAmount: averageDailyProtein,
        targetAmount: nutritionGoals.targetProtein,
        unit: 'g',
        severity: 'medium',
        recommendations: ['Add more protein-rich foods', 'Consider protein supplements']
      });
    }

    return {
      averageDailyCalories,
      averageDailyProtein,
      averageDailyCarbs,
      averageDailyFat,
      totalWeeklyCalories: totalCalories,
      nutritionGoals,
      deficiencies,
      recommendations: this.generateRecommendations(deficiencies)
    };
  }

  /**
   * Generate recommendations based on deficiencies
   */
  private generateRecommendations(deficiencies: NutritionalDeficiency[]): string[] {
    const recommendations: string[] = [];

    deficiencies.forEach(deficiency => {
      if (deficiency.severity === 'high') {
        recommendations.push(`Consider supplementing ${deficiency.nutrient}`);
      } else if (deficiency.severity === 'medium') {
        recommendations.push(`Increase ${deficiency.nutrient} intake through food choices`);
      }
    });

    return recommendations;
  }

  /**
   * Validate meal plan
   */
  private validateMealPlan(mealPlan: MealPlan): MealPlanValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Check for missing meals
    mealPlan.weeks.forEach((week, weekIndex) => {
      week.days.forEach((day, dayIndex) => {
        if (day.meals.length === 0) {
          errors.push({
            type: 'error',
            message: 'No meals planned for this day',
            location: `week${weekIndex + 1}.day${dayIndex + 1}`
          });
        }
      });
    });

    // Check nutritional balance
    mealPlan.weeks.forEach((week, weekIndex) => {
      week.days.forEach((day, dayIndex) => {
        const calorieDiff = Math.abs(day.totalCalories - mealPlan.energyNeeds.targetCalories);
        if (calorieDiff > mealPlan.energyNeeds.targetCalories * 0.2) {
          warnings.push({
            type: 'warning',
            message: `Calorie target significantly off (${calorieDiff} calories)`,
            location: `week${weekIndex + 1}.day${dayIndex + 1}`,
            impact: 'medium'
          });
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Generate unique meal plan ID
   */
  private generateMealPlanId(): string {
    return `meal-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
} 