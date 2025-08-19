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

// Import database service
import { databaseService } from '../database-service';

export class MealPlanGenerator {
  private recipes: Recipe[] = [];
  private usedRecipes: Set<string> = new Set();
  private dailyUsedRecipes: Map<string, Set<string>> = new Map(); // Track per-day usage

  constructor() {
    // Initialize recipes asynchronously
    this.initializeRealRecipes();
  }

  /**
   * Initialize with real recipes from the database
   */
  private async initializeRealRecipes(): Promise<void> {
    try {
      // Get recipes from database
      const dbRecipes = await databaseService.getRecipes();
      
      if (dbRecipes && dbRecipes.length > 0) {
        // Convert database recipes to the format expected by the meal plan system
        this.recipes = dbRecipes.map(recipe => {
          // Debug dietary categories mapping
          console.log(`🔍 Recipe ${recipe.title}:`, {
            rawCategories: recipe.dietaryCategories,
            type: typeof recipe.dietaryCategories,
            length: recipe.dietaryCategories?.length
          });
          
          // Fix dietary categories mapping
          let dietaryApproaches: string[] = [];
          if (recipe.dietaryCategories) {
            if (Array.isArray(recipe.dietaryCategories)) {
              dietaryApproaches = recipe.dietaryCategories
                .filter(cat => cat && typeof cat === 'string')
                .map(cat => (cat as string).toLowerCase().trim());
            } else if (typeof recipe.dietaryCategories === 'string') {
              // Handle case where it's a single string
              dietaryApproaches = [recipe.dietaryCategories.toLowerCase().trim()];
            }
          }
          
          // Add fallback if no categories found
          if (dietaryApproaches.length === 0) {
            // Check if title contains keto-related keywords
            const title = recipe.title.toLowerCase();
            if (title.includes('keto') || title.includes('low-carb') || title.includes('lav-carb')) {
              dietaryApproaches = ['keto'];
              console.log(`🔧 Added 'keto' to ${recipe.title} based on title`);
            }
          }
          
          console.log(`✅ Final dietary approaches for ${recipe.title}:`, dietaryApproaches);
          
          return {
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients?.map(ing => ({
              ingredientId: ing.id || ing.name,
              amount: ing.amount,
              unit: ing.unit
            })) || [],
            instructions: recipe.instructions?.map(inst => inst.instruction) || [],
            prepTime: recipe.preparationTime || 0,
            cookTime: recipe.cookingTime || 0,
            servings: recipe.servings || 4,
            categories: [this.mapCategory(recipe.mainCategory || 'Aftensmad')],
            dietaryApproaches,
             nutritionalInfo: {
              caloriesPer100g: recipe.calories || 0,
              proteinPer100g: recipe.protein || 0,
              carbsPer100g: recipe.carbs || 0,
              fatPer100g: recipe.fat || 0,
              fiberPer100g: recipe.fiber || 0,
              // If full Frida per-portion JSON exists, map it as per-portion fields
              ...(
                recipe.nutritionalInfo ? {
                  caloriesPerPortion: recipe.nutritionalInfo.calories,
                  proteinPerPortion: recipe.nutritionalInfo.protein,
                  carbsPerPortion: recipe.nutritionalInfo.carbs,
                  fatPerPortion: recipe.nutritionalInfo.fat,
                  fiberPerPortion: recipe.nutritionalInfo.fiber,
                  vitaminMap: recipe.nutritionalInfo.vitamins || {},
                  mineralMap: recipe.nutritionalInfo.minerals || {}
                } : {}
              )
            },
            images: [recipe.imageUrl || ''],
            slug: recipe.slug || '',
            isActive: true,
            createdAt: recipe.publishedAt || new Date(),
            updatedAt: recipe.updatedAt || new Date()
          };
        });
        
        console.log(`✅ Loaded ${this.recipes.length} recipes from database for meal planning`);
        console.log(`📊 Dietary approaches summary:`, this.recipes.reduce((acc, recipe) => {
          recipe.dietaryApproaches.forEach(approach => {
            acc[approach] = (acc[approach] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>));
      } else {
        console.warn('⚠️ No recipes found in database, using fallback sample data');
        this.loadFallbackRecipes();
      }
    } catch (error) {
      console.error('❌ Error loading recipes from database:', error);
      console.warn('⚠️ Using fallback sample data due to database error');
      this.loadFallbackRecipes();
    }
  }

  /**
   * Load fallback sample recipes when database is unavailable
   */
  private loadFallbackRecipes(): void {
    this.recipes = [
      {
        id: 'fallback-1',
        title: 'Kylling og grøntsager',
        description: 'Sund kylling med friske grøntsager',
        ingredients: [
          { ingredientId: 'kylling', amount: 200, unit: 'g' },
          { ingredientId: 'broccoli', amount: 150, unit: 'g' }
        ],
        instructions: ['Steg kylling', 'Kog grøntsager'],
        prepTime: 10,
        cookTime: 20,
        servings: 2,
        categories: [RecipeCategory.Dinner],
        dietaryApproaches: ['keto', 'low-carb'],
        nutritionalInfo: {
          caloriesPer100g: 120,
          proteinPer100g: 25,
          carbsPer100g: 5,
          fatPer100g: 3,
          fiberPer100g: 4
        },
        images: [''],
        slug: 'kylling-grontsager',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'fallback-2',
        title: 'Laks med spinat',
        description: 'Omega-3 rig laks med spinat',
        ingredients: [
          { ingredientId: 'laks', amount: 150, unit: 'g' },
          { ingredientId: 'spinat', amount: 100, unit: 'g' }
        ],
        instructions: ['Steg laks', 'Tilbered spinat'],
        prepTime: 5,
        cookTime: 15,
        servings: 1,
        categories: [RecipeCategory.Dinner],
        dietaryApproaches: ['keto', 'paleo'],
        nutritionalInfo: {
          caloriesPer100g: 180,
          proteinPer100g: 22,
          carbsPer100g: 3,
          fatPer100g: 10,
          fiberPer100g: 2
        },
        images: [''],
        slug: 'laks-spinat',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'fallback-3',
        title: 'Æggehvider med avocado',
        description: 'Protein-rig morgenmad med sundt fedt',
        ingredients: [
          { ingredientId: 'æggehvider', amount: 200, unit: 'g' },
          { ingredientId: 'avocado', amount: 100, unit: 'g' }
        ],
        instructions: ['Steg æggehvider', 'Skær avocado'],
        prepTime: 5,
        cookTime: 10,
        servings: 1,
        categories: [RecipeCategory.Breakfast],
        dietaryApproaches: ['keto', 'high-protein'],
        nutritionalInfo: {
          caloriesPer100g: 140,
          proteinPer100g: 20,
          carbsPer100g: 2,
          fatPer100g: 8,
          fiberPer100g: 3
        },
        images: [''],
        slug: 'aeggehvider-avocado',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'fallback-4',
        title: 'Tun med grønne bønner',
        description: 'Lean protein med fiber-rige grøntsager',
        ingredients: [
          { ingredientId: 'tun', amount: 150, unit: 'g' },
          { ingredientId: 'grønne bønner', amount: 100, unit: 'g' }
        ],
        instructions: ['Steg tun', 'Kog bønner'],
        prepTime: 5,
        cookTime: 15,
        servings: 1,
        categories: [RecipeCategory.Lunch],
        dietaryApproaches: ['keto', 'low-carb'],
        nutritionalInfo: {
          caloriesPer100g: 160,
          proteinPer100g: 28,
          carbsPer100g: 4,
          fatPer100g: 2,
          fiberPer100g: 5
        },
        images: [''],
        slug: 'tun-gronne-bonner',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log(`📋 Loaded ${this.recipes.length} fallback recipes for meal planning`);
  }

  /**
   * Map Danish category names to RecipeCategory enum
   */
  private mapCategory(danishCategory: string): RecipeCategory {
    const categoryMap: { [key: string]: RecipeCategory } = {
      'Morgenmad': RecipeCategory.Breakfast,
      'Frokost': RecipeCategory.Lunch,
      'Aftensmad': RecipeCategory.Dinner,
      'Snack': RecipeCategory.Snack,
      'Dessert': RecipeCategory.Dessert
    };
    
    return categoryMap[danishCategory] || RecipeCategory.Dinner;
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
    let totalFiber = 0;
    let totalSugar = 0;
    let totalSodium = 0;
    let totalVitamins: { [key: string]: number } = {};
    let totalMinerals: { [key: string]: number } = {};

    // Generate meals for each meal type
    for (const mealDistribution of config.mealStructure.mealDistribution) {
      const meal = await this.generateMeal(mealDistribution, config, date);
      meals.push(meal);

      totalCalories += meal.adjustedCalories;
      totalProtein += meal.adjustedProtein;
      totalCarbs += meal.adjustedCarbs;
      totalFat += meal.adjustedFat;
      totalFiber += meal.adjustedFiber || 0;
      totalSugar += meal.adjustedSugar || 0;
      totalSodium += meal.adjustedSodium || 0;
      
      // Add vitamins
      if (meal.adjustedVitamins) {
        Object.entries(meal.adjustedVitamins).forEach(([vitamin, amount]) => {
          totalVitamins[vitamin] = (totalVitamins[vitamin] || 0) + amount;
        });
      }
      
      // Add minerals
      if (meal.adjustedMinerals) {
        Object.entries(meal.adjustedMinerals).forEach(([mineral, amount]) => {
          totalMinerals[mineral] = (totalMinerals[mineral] || 0) + amount;
        });
      }
    }

    return {
      date,
      meals,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
      totalSugar,
      totalSodium,
      totalVitamins,
      totalMinerals
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
    
    // Select the best recipe with meal type consideration
    const selectedRecipe = this.selectRecipe(scoredRecipes, date, mealDistribution.mealType);
    
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
      adjustedFat: adjustedValues.fat,
      adjustedFiber: adjustedValues.fiber,
      adjustedSugar: adjustedValues.sugar,
      adjustedSodium: adjustedValues.sodium,
      adjustedVitamins: adjustedValues.vitamins,
      adjustedMinerals: adjustedValues.minerals
    };
  }

  /**
   * Filter recipes based on dietary approach and exclusions
   */
  private filterRecipes(config: MealPlanConfig): Recipe[] {
    console.log(`🔍 Filtering ${this.recipes.length} recipes for dietary approach: ${config.dietaryApproach.id}`);
    console.log(`🔍 Available recipes:`, this.recipes.map(r => ({ title: r.title, approaches: r.dietaryApproaches })));
    
    const filteredRecipes = this.recipes.filter(recipe => {
      // Check dietary approach compatibility
      const hasDietaryApproach = recipe.dietaryApproaches.some(approach => 
        approach.toLowerCase() === config.dietaryApproach.id.toLowerCase()
      );
      
      if (!hasDietaryApproach) {
        console.log(`❌ Recipe ${recipe.title} excluded: no ${config.dietaryApproach.id} approach (has: ${recipe.dietaryApproaches.join(', ')})`);
        return false;
      }

      // Additional keto-specific filtering
      if (config.dietaryApproach.id.toLowerCase() === 'keto') {
        const carbsPer100g = recipe.nutritionalInfo.carbsPer100g || 0;
        if (carbsPer100g > 10) { // Keto: max 10g carbs per 100g
          console.log(`❌ Recipe ${recipe.title} excluded: too high carbs (${carbsPer100g}g/100g) for keto`);
          return false;
        }
      }

      // Check for excluded ingredients
      const violations = ingredientService.checkRecipeExclusions(recipe, config.excludedIngredients);
      if (violations.length > 0) {
        console.log(`❌ Recipe ${recipe.title} excluded: contains excluded ingredients: ${violations.join(', ')}`);
        return false;
      }

      // Check for allergies
      for (const allergy of config.allergies) {
        const hasAllergy = recipe.ingredients.some(ingredient => {
          const ingredientData = ingredientService.getIngredientById(ingredient.ingredientId);
          return ingredientData?.allergens?.includes(allergy);
        });
        if (hasAllergy) {
          console.log(`❌ Recipe ${recipe.title} excluded: contains allergy: ${allergy}`);
          return false;
        }
      }

      console.log(`✅ Recipe ${recipe.title} passed all filters`);
      return true;
    });
    
    console.log(`🔍 Filtered to ${filteredRecipes.length} suitable recipes`);
    return filteredRecipes;
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
    // Strong penalty for recently used recipes
    if (this.usedRecipes.has(recipe.id)) {
      return 0; // No score for used recipes - force variety
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
   * Select the best recipe with variety consideration
   */
  private selectRecipe(scoredRecipes: RecipeScore[], date: Date, mealType: MealType): Recipe {
    if (scoredRecipes.length === 0) {
      throw new Error('No suitable recipes found');
    }

    const dateKey = date.toDateString();
    const mealKey = `${dateKey}-${mealType}`;
    
    // Initialize daily tracking if not exists
    if (!this.dailyUsedRecipes.has(dateKey)) {
      this.dailyUsedRecipes.set(dateKey, new Set());
    }
    
    const dailyUsed = this.dailyUsedRecipes.get(dateKey)!;
    
    // Filter out recipes that have been used today
    const unusedTodayRecipes = scoredRecipes.filter(score => !dailyUsed.has(score.recipe.id));
    
    if (unusedTodayRecipes.length === 0) {
      // If all recipes used today, clear daily tracking and continue
      console.log(`🔄 All recipes used for ${dateKey}, clearing daily tracking`);
      dailyUsed.clear();
      return scoredRecipes[0].recipe;
    }

    // Select from top 3 unused recipes today with some randomness
    const topRecipes = unusedTodayRecipes.slice(0, Math.min(3, unusedTodayRecipes.length));
    const randomIndex = Math.floor(Math.random() * topRecipes.length);
    const selectedRecipe = topRecipes[randomIndex].recipe;
    
    // Mark as used today
    dailyUsed.add(selectedRecipe.id);
    this.usedRecipes.add(selectedRecipe.id);
    
    console.log(`✅ Selected recipe for ${mealKey}: ${selectedRecipe.title} (variety score: ${topRecipes[randomIndex].compatibility.varietyScore})`);
    console.log(`📊 Daily usage for ${dateKey}: ${dailyUsed.size} recipes used`);

    return selectedRecipe;
  }

  /**
   * Calculate servings to meet macro targets
   */
  private calculateServings(recipe: Recipe, mealDistribution: any): number {
    const targetCalories = mealDistribution.targetCalories;
    // Prefer per-portion calories if available (from Frida per-portion JSON)
    const perPortionCalories = recipe.nutritionalInfo.caloriesPerPortion;
    if (perPortionCalories && perPortionCalories > 0) {
      const servings = targetCalories / perPortionCalories;
      return Math.max(0.5, Math.min(3, Math.round(servings * 10) / 10));
    }

    // Fallback to per-100g
    const recipeCaloriesPer100g = recipe.nutritionalInfo.caloriesPer100g || 100;
    const servings = targetCalories / recipeCaloriesPer100g;
    return Math.max(0.5, Math.min(3, Math.round(servings * 10) / 10));
  }

  /**
   * Calculate adjusted nutrition per serving
   * FIXED: Now properly calculates per-serving nutrition instead of per-100g
   */
  private calculateAdjustedNutrition(recipe: Recipe, servings: number): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    vitamins?: { [key: string]: number };
    minerals?: { [key: string]: number };
  } {
    // Prefer per-portion nutrition if present (Frida per-portion JSON stored on recipe)
    const hasPerPortion = typeof recipe.nutritionalInfo.caloriesPerPortion === 'number' && recipe.nutritionalInfo.caloriesPerPortion > 0;
    const multiplier = servings; // multiplier scales per-portion values directly

    const result: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      vitamins?: { [key: string]: number };
      minerals?: { [key: string]: number };
    } = {
      calories: hasPerPortion
        ? (recipe.nutritionalInfo.caloriesPerPortion || 0) * multiplier
        : (recipe.nutritionalInfo.caloriesPer100g * recipe.servings / 100) * (servings / recipe.servings),
      protein: hasPerPortion
        ? (recipe.nutritionalInfo.proteinPerPortion || 0) * multiplier
        : (recipe.nutritionalInfo.proteinPer100g * recipe.servings / 100) * (servings / recipe.servings),
      carbs: hasPerPortion
        ? (recipe.nutritionalInfo.carbsPerPortion || 0) * multiplier
        : (recipe.nutritionalInfo.carbsPer100g * recipe.servings / 100) * (servings / recipe.servings),
      fat: hasPerPortion
        ? (recipe.nutritionalInfo.fatPerPortion || 0) * multiplier
        : (recipe.nutritionalInfo.fatPer100g * recipe.servings / 100) * (servings / recipe.servings)
    };

    // Add micro-nutrition if available (prefer per-portion, fallback to per-100g)
    if (hasPerPortion) {
      if (typeof recipe.nutritionalInfo.fiberPerPortion === 'number') {
        result.fiber = recipe.nutritionalInfo.fiberPerPortion * multiplier;
      }
      if (typeof recipe.nutritionalInfo.sugarPerPortion === 'number') {
        result.sugar = recipe.nutritionalInfo.sugarPerPortion * multiplier;
      }
      if (typeof recipe.nutritionalInfo.sodiumPerPortion === 'number') {
        result.sodium = recipe.nutritionalInfo.sodiumPerPortion * multiplier;
      }
    } else {
      if (recipe.nutritionalInfo.fiberPer100g) {
        result.fiber = (recipe.nutritionalInfo.fiberPer100g * recipe.servings / 100) * (servings / recipe.servings);
      }
      if (recipe.nutritionalInfo.sugarPer100g) {
        result.sugar = (recipe.nutritionalInfo.sugarPer100g * recipe.servings / 100) * (servings / recipe.servings);
      }
      if (recipe.nutritionalInfo.sodiumPer100g) {
        result.sodium = (recipe.nutritionalInfo.sodiumPer100g * recipe.servings / 100) * (servings / recipe.servings);
      }
    }

    // Add vitamins and minerals if available
    // Vitamins & minerals
    if (hasPerPortion && recipe.nutritionalInfo.vitaminMap) {
      result.vitamins = {};
      Object.entries(recipe.nutritionalInfo.vitaminMap).forEach(([k, v]) => {
        result.vitamins![k] = (v || 0) * multiplier;
      });
    } else if (recipe.nutritionalInfo.vitamins) {
      result.vitamins = {};
      recipe.nutritionalInfo.vitamins.forEach(vitamin => {
        const baseAmount = (vitamin.amountPer100g * recipe.servings) / 100;
        result.vitamins![vitamin.vitamin] = baseAmount * (servings / recipe.servings);
      });
    }

    if (hasPerPortion && recipe.nutritionalInfo.mineralMap) {
      result.minerals = {};
      Object.entries(recipe.nutritionalInfo.mineralMap).forEach(([k, v]) => {
        result.minerals![k] = (v || 0) * multiplier;
      });
    } else if (recipe.nutritionalInfo.minerals) {
      result.minerals = {};
      recipe.nutritionalInfo.minerals.forEach(mineral => {
        const baseAmount = (mineral.amountPer100g * recipe.servings) / 100;
        result.minerals![mineral.mineral] = baseAmount * (servings / recipe.servings);
      });
    }

    return result;
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
      } else if (ingredient?.category === 'groent' || ingredient?.category === 'frugt') {
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
   * Calculate weekly nutrition with enhanced micro-nutrition tracking
   * FIXED: Now includes fiber, sugar, sodium, vitamins, and minerals
   */
  private calculateWeeklyNutrition(days: DayPlan[], config: MealPlanConfig): WeeklyNutrition {
    const totalCalories = days.reduce((sum, day) => sum + day.totalCalories, 0);
    const totalProtein = days.reduce((sum, day) => sum + day.totalProtein, 0);
    const totalCarbs = days.reduce((sum, day) => sum + day.totalCarbs, 0);
    const totalFat = days.reduce((sum, day) => sum + day.totalFat, 0);

    // Calculate micro-nutrition totals
    const totalFiber = days.reduce((sum, day) => sum + (day.totalFiber || 0), 0);
    const totalSugar = days.reduce((sum, day) => sum + (day.totalSugar || 0), 0);
    const totalSodium = days.reduce((sum, day) => sum + (day.totalSodium || 0), 0);

    // Aggregate vitamins and minerals across all days
    const vitaminTotals: { [key: string]: number } = {};
    const mineralTotals: { [key: string]: number } = {};
    
    days.forEach(day => {
      day.meals.forEach(meal => {
        if (meal.adjustedVitamins) {
          Object.entries(meal.adjustedVitamins).forEach(([vitamin, amount]) => {
            vitaminTotals[vitamin] = (vitaminTotals[vitamin] || 0) + amount;
          });
        }
        if (meal.adjustedMinerals) {
          Object.entries(meal.adjustedMinerals).forEach(([mineral, amount]) => {
            mineralTotals[mineral] = (mineralTotals[mineral] || 0) + amount;
          });
        }
      });
    });

    const averageDailyCalories = totalCalories / 7;
    const averageDailyProtein = totalProtein / 7;
    const averageDailyCarbs = totalCarbs / 7;
    const averageDailyFat = totalFat / 7;
    const averageDailyFiber = totalFiber / 7;
    const averageDailySugar = totalSugar / 7;
    const averageDailySodium = totalSodium / 7;

    const nutritionGoals: NutritionGoals = {
      targetCalories: config.targetCalories,
      targetProtein: config.macroTargets.protein,
      targetCarbs: config.macroTargets.carbohydrates,
      targetFat: config.macroTargets.fat,
      // Defaults for micro targets (grams for fiber, mg for sodium)
      targetFiber: 25,
      targetSodium: 2300
    };

    // Calculate deficiencies with enhanced detection
    const deficiencies: NutritionalDeficiency[] = [];
    
    // Macro deficiencies
    if (averageDailyProtein < nutritionGoals.targetProtein * 0.9) {
      deficiencies.push({
        nutrient: 'Protein',
        currentAmount: averageDailyProtein,
        targetAmount: nutritionGoals.targetProtein,
        unit: 'g',
        severity: 'medium',
        recommendations: ['Add more protein-rich foods', 'Consider protein supplements', 'Include lean meats, fish, eggs, or legumes']
      });
    }

    if (averageDailyCarbs < nutritionGoals.targetCarbs * 0.8) {
      deficiencies.push({
        nutrient: 'Carbohydrates',
        currentAmount: averageDailyCarbs,
        targetAmount: nutritionGoals.targetCarbs,
        unit: 'g',
        severity: 'low',
        recommendations: ['Include more whole grains', 'Add fruits and vegetables', 'Consider complex carbs for sustained energy']
      });
    }

    if (averageDailyFat < nutritionGoals.targetFat * 0.8) {
      deficiencies.push({
        nutrient: 'Healthy Fats',
        currentAmount: averageDailyFat,
        targetAmount: nutritionGoals.targetFat,
        unit: 'g',
        severity: 'low',
        recommendations: ['Add healthy fats like nuts, seeds, avocados', 'Include fatty fish', 'Use olive oil for cooking']
      });
    }

    // Micro-nutrition deficiencies
    const fiberTarget = nutritionGoals.targetFiber ?? 25;
    if (averageDailyFiber < fiberTarget * 0.8) {
      deficiencies.push({
        nutrient: 'Fiber',
        currentAmount: averageDailyFiber,
        targetAmount: fiberTarget,
        unit: 'g',
        severity: 'medium',
        recommendations: ['Increase vegetable intake', 'Add more whole grains', 'Include legumes and nuts', 'Eat fruits with skin']
      });
    }

    const sodiumTarget = nutritionGoals.targetSodium ?? 2300;
    if (averageDailySodium > sodiumTarget * 1.2) {
      deficiencies.push({
        nutrient: 'Sodium',
        currentAmount: averageDailySodium,
        targetAmount: sodiumTarget,
        unit: 'mg',
        severity: 'high',
        recommendations: ['Reduce processed foods', 'Use herbs and spices instead of salt', 'Read nutrition labels', 'Cook more meals from scratch']
      });
    }

    // Vitamin and mineral deficiencies
    Object.entries(vitaminTotals).forEach(([vitamin, totalAmount]) => {
      const dailyAverage = totalAmount / 7;
      const targetAmount = this.getVitaminTarget(vitamin);
      if (dailyAverage < targetAmount * 0.8) {
        deficiencies.push({
          nutrient: `Vitamin ${vitamin}`,
          currentAmount: dailyAverage,
          targetAmount: targetAmount,
          unit: this.getVitaminUnit(vitamin),
          severity: 'medium',
          recommendations: this.getVitaminRecommendations(vitamin)
        });
      }
    });

    Object.entries(mineralTotals).forEach(([mineral, totalAmount]) => {
      const dailyAverage = totalAmount / 7;
      const targetAmount = this.getMineralTarget(mineral);
      if (dailyAverage < targetAmount * 0.8) {
        deficiencies.push({
          nutrient: mineral,
          currentAmount: dailyAverage,
          targetAmount: targetAmount,
          unit: this.getMineralUnit(mineral),
          severity: 'medium',
          recommendations: this.getMineralRecommendations(mineral)
        });
      }
    });

    // Identify strengths: top 3 nutrients where coverage >= 1.0 (meeting or exceeding targets)
    const strengths: { nutrient: string; coverage: number; unit: string; dailyAverage: number; targetAmount: number }[] = [];
    Object.entries(vitaminTotals).forEach(([vitamin, totalAmount]) => {
      const dailyAverage = totalAmount / 7;
      const target = this.getVitaminTarget(vitamin);
      if (target > 0) {
        const coverage = dailyAverage / target;
        if (coverage >= 1.0) {
          strengths.push({ nutrient: `Vitamin ${vitamin}`, coverage, unit: this.getVitaminUnit(vitamin), dailyAverage, targetAmount: target });
        }
      }
    });
    Object.entries(mineralTotals).forEach(([mineral, totalAmount]) => {
      const dailyAverage = totalAmount / 7;
      const target = this.getMineralTarget(mineral);
      if (target > 0) {
        const coverage = dailyAverage / target;
        if (coverage >= 1.0) {
          strengths.push({ nutrient: mineral, coverage, unit: this.getMineralUnit(mineral), dailyAverage, targetAmount: target });
        }
      }
    });
    strengths.sort((a, b) => b.coverage - a.coverage);
    const topStrengths = strengths.slice(0, 3);

    return {
      averageDailyCalories,
      averageDailyProtein,
      averageDailyCarbs,
      averageDailyFat,
      averageDailyFiber,
      averageDailySugar,
      averageDailySodium,
      totalWeeklyCalories: totalCalories,
      nutritionGoals,
      deficiencies,
      recommendations: this.generateRecommendations(deficiencies),
      vitaminTotals,
      mineralTotals,
      strengths: topStrengths
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

  // Helper methods for enhanced micro-nutrition tracking
  private getVitaminTarget(vitamin: string): number {
    switch (vitamin) {
      case 'Vitamin A': return 900; // IU
      case 'Vitamin C': return 90; // mg
      case 'Vitamin D': return 20; // IU
      case 'Vitamin E': return 15; // IU
      case 'Vitamin K': return 120; // mcg
      default: return 0;
    }
  }

  private getVitaminUnit(vitamin: string): string {
    switch (vitamin) {
      case 'Vitamin A': return 'IU';
      case 'Vitamin C': return 'mg';
      case 'Vitamin D': return 'IU';
      case 'Vitamin E': return 'IU';
      case 'Vitamin K': return 'mcg';
      default: return 'mcg';
    }
  }

  private getVitaminRecommendations(vitamin: string): string[] {
    switch (vitamin) {
      case 'Vitamin A': return ['Eat liver, fish liver oil, eggs, and dark green leafy vegetables'];
      case 'Vitamin C': return ['Eat citrus fruits, berries, tomatoes, and green vegetables'];
      case 'Vitamin D': return ['Sun exposure, fatty fish, eggs, and fortified foods'];
      case 'Vitamin E': return ['Eat nuts, seeds, vegetable oils, and green leafy vegetables'];
      case 'Vitamin K': return ['Eat leafy green vegetables, broccoli, and fortified foods'];
      default: return [];
    }
  }

  private getMineralTarget(mineral: string): number {
    switch (mineral) {
      case 'Calcium': return 1000; // mg
      case 'Iron': return 18; // mg
      case 'Magnesium': return 400; // mg
      case 'Phosphorus': return 1200; // mg
      case 'Potassium': return 4700; // mg
      case 'Sodium': return 2300; // mg
      case 'Zinc': return 11; // mg
      case 'Copper': return 0.9; // mg
      case 'Manganese': return 2.3; // mg
      case 'Selenium': return 55; // mcg
      default: return 0;
    }
  }

  private getMineralUnit(mineral: string): string {
    switch (mineral) {
      case 'Calcium': return 'mg';
      case 'Iron': return 'mg';
      case 'Magnesium': return 'mg';
      case 'Phosphorus': return 'mg';
      case 'Potassium': return 'mg';
      case 'Sodium': return 'mg';
      case 'Zinc': return 'mg';
      case 'Copper': return 'mg';
      case 'Manganese': return 'mg';
      case 'Selenium': return 'mcg';
      default: return 'mcg';
    }
  }

  private getMineralRecommendations(mineral: string): string[] {
    switch (mineral) {
      case 'Calcium': return ['Eat dairy products, leafy green vegetables, and fortified foods'];
      case 'Iron': return ['Eat red meat, poultry, fish, beans, and iron-fortified cereals'];
      case 'Magnesium': return ['Eat whole grains, nuts, seeds, and green leafy vegetables'];
      case 'Phosphorus': return ['Eat meat, fish, poultry, and dairy products'];
      case 'Potassium': return ['Eat bananas, oranges, potatoes, and leafy green vegetables'];
      case 'Sodium': return ['Read nutrition labels and reduce processed foods'];
      case 'Zinc': return ['Eat oysters, beef, pork, and fortified cereals'];
      case 'Copper': return ['Eat shellfish, nuts, and whole grains'];
      case 'Manganese': return ['Eat whole grains, nuts, and green leafy vegetables'];
      case 'Selenium': return ['Eat Brazil nuts, seafood, and fortified foods'];
      default: return [];
    }
  }
} 