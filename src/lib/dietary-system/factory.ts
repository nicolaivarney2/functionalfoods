import { DietaryApproach, MacroRatio, MealStructure, MealType, FoodCategory, FoodRestriction, NutritionalPriority } from './types';

export class DietaryApproachFactory {
  private dietaryApproaches: Map<string, DietaryApproach> = new Map();

  constructor() {
    this.initializeDiets();
  }

  /**
   * Initialize all dietary approaches
   */
  private initializeDiets(): void {
    this.registerDiet(this.createKetoDiet());
    this.registerDiet(this.createSenseDiet());
    this.registerDiet(this.createLCHFPaleoDiet());
    this.registerDiet(this.createAntiInflammatoryDiet());
    this.registerDiet(this.createMediterraneanDiet());
    this.registerDiet(this.createFlexitarianDiet());
    this.registerDiet(this.createFiveTwoDiet());
  }

  /**
   * Register a dietary approach
   */
  private registerDiet(diet: DietaryApproach): void {
    this.dietaryApproaches.set(diet.id, diet);
  }

  /**
   * Get a specific dietary approach by ID
   */
  getDiet(id: string): DietaryApproach | undefined {
    return this.dietaryApproaches.get(id);
  }

  /**
   * Get all available dietary approaches
   */
  getAllDiets(): DietaryApproach[] {
    return Array.from(this.dietaryApproaches.values());
  }

  /**
   * Get dietary approaches by category or filter
   */
  getDietsByFilter(filter: (diet: DietaryApproach) => boolean): DietaryApproach[] {
    return this.getAllDiets().filter(filter);
  }

  /**
   * Create Keto dietary approach
   */
  private createKetoDiet(): DietaryApproach {
    return {
      id: 'keto',
      name: 'Ketogenic Diet',
      description: 'High-fat, adequate-protein, low-carbohydrate diet that forces the body to burn fats rather than carbohydrates.',
      macroRatios: {
        carbohydrates: { min: 5, target: 5, max: 10 },
        protein: { min: 15, target: 20, max: 25 },
        fat: { min: 70, target: 75, max: 80 }
      },
      mealStructure: {
        mealsPerDay: 3,
        mealDistribution: [
          {
            mealType: MealType.Breakfast,
            macroDistribution: {
              carbohydrates: { min: 5, target: 5, max: 10 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 65, target: 70, max: 75 }
            },
            portionSize: { unit: 'calories', amount: 500 },
            isOptional: true
          },
          {
            mealType: MealType.Lunch,
            macroDistribution: {
              carbohydrates: { min: 5, target: 5, max: 10 },
              protein: { min: 25, target: 30, max: 35 },
              fat: { min: 60, target: 65, max: 70 }
            },
            portionSize: { unit: 'calories', amount: 600 }
          },
          {
            mealType: MealType.Dinner,
            macroDistribution: {
              carbohydrates: { min: 5, target: 5, max: 10 },
              protein: { min: 25, target: 30, max: 35 },
              fat: { min: 60, target: 65, max: 70 }
            },
            portionSize: { unit: 'calories', amount: 700 }
          }
        ],
        snacksAllowed: true,
        optionalBreakfast: true
      },
      nutritionalPriorities: [
        { nutrient: 'Omega-3 fatty acids', importance: 8, reason: 'Anti-inflammatory benefits' },
        { nutrient: 'Electrolytes', importance: 9, reason: 'Prevent keto flu' },
        { nutrient: 'Fiber', importance: 7, reason: 'Digestive health' }
      ],
      restrictions: [
        { category: 'Grains', reason: 'High carbohydrate content', strictness: 'eliminate' },
        { category: 'Sugars', reason: 'Disrupts ketosis', strictness: 'eliminate' },
        { category: 'ProcessedFoods', reason: 'Often contain hidden carbs', strictness: 'avoid' }
      ],
      allowedFoods: [
        FoodCategory.Vegetables,
        FoodCategory.Proteins,
        FoodCategory.Fats,
        FoodCategory.Dairy,
        FoodCategory.Nuts,
        FoodCategory.Seeds
      ],
      specialConsiderations: [
        'Focus on non-starchy vegetables',
        'Include adequate electrolytes',
        'Monitor ketone levels during adaptation'
      ]
    };
  }

  /**
   * Create Sense dietary approach
   */
  private createSenseDiet(): DietaryApproach {
    return {
      id: 'sense',
      name: 'Sense Diet',
      description: 'Mindful eating approach focused on whole foods, balanced nutrition, and sustainable lifestyle changes.',
      macroRatios: {
        carbohydrates: { min: 40, target: 45, max: 50 },
        protein: { min: 20, target: 25, max: 30 },
        fat: { min: 25, target: 30, max: 35 }
      },
      mealStructure: {
        mealsPerDay: 4,
        mealDistribution: [
          {
            mealType: MealType.Breakfast,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 400 }
          },
          {
            mealType: MealType.Lunch,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 25, target: 30, max: 35 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Dinner,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 25, target: 30, max: 35 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Snack,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 200 }
          }
        ],
        snacksAllowed: true
      },
      nutritionalPriorities: [
        { nutrient: 'Fiber', importance: 9, reason: 'Satiety and digestive health' },
        { nutrient: 'Omega-3 fatty acids', importance: 7, reason: 'Anti-inflammatory benefits' },
        { nutrient: 'Antioxidants', importance: 8, reason: 'Overall health and wellness' }
      ],
      restrictions: [
        { category: 'ProcessedFoods', reason: 'Focus on whole foods', strictness: 'limit' },
        { category: 'Sugars', reason: 'Blood sugar stability', strictness: 'limit' }
      ],
      allowedFoods: [
        FoodCategory.Vegetables,
        FoodCategory.Fruits,
        FoodCategory.Grains,
        FoodCategory.Proteins,
        FoodCategory.Dairy,
        FoodCategory.Fats,
        FoodCategory.Nuts,
        FoodCategory.Seeds,
        FoodCategory.Legumes
      ],
      specialConsiderations: [
        'Emphasize mindful eating practices',
        'Focus on food quality over quantity',
        'Include variety for nutritional completeness'
      ]
    };
  }

  /**
   * Create LCHF/Paleo dietary approach
   */
  private createLCHFPaleoDiet(): DietaryApproach {
    return {
      id: 'lchf-paleo',
      name: 'LCHF/Paleo',
      description: 'Low-carb, high-fat approach based on paleo principles with emphasis on whole, unprocessed foods.',
      macroRatios: {
        carbohydrates: { min: 25, target: 30, max: 35 },
        protein: { min: 35, target: 40, max: 45 },
        fat: { min: 25, target: 30, max: 35 }
      },
      mealStructure: {
        mealsPerDay: 3,
        mealDistribution: [
          {
            mealType: MealType.Breakfast,
            macroDistribution: {
              carbohydrates: { min: 25, target: 30, max: 35 },
              protein: { min: 35, target: 40, max: 45 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Lunch,
            macroDistribution: {
              carbohydrates: { min: 25, target: 30, max: 35 },
              protein: { min: 40, target: 45, max: 50 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 600 }
          },
          {
            mealType: MealType.Dinner,
            macroDistribution: {
              carbohydrates: { min: 25, target: 30, max: 35 },
              protein: { min: 40, target: 45, max: 50 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 700 }
          }
        ],
        snacksAllowed: true
      },
      nutritionalPriorities: [
        { nutrient: 'Protein', importance: 9, reason: 'Muscle maintenance and satiety' },
        { nutrient: 'Fiber', importance: 8, reason: 'Digestive health' },
        { nutrient: 'Omega-3 fatty acids', importance: 7, reason: 'Anti-inflammatory benefits' }
      ],
      restrictions: [
        { category: 'ProcessedFoods', reason: 'Paleo principles', strictness: 'eliminate' },
        { category: 'Grains', reason: 'Paleo principles', strictness: 'eliminate' },
        { category: 'Legumes', reason: 'Paleo principles', strictness: 'eliminate' },
        { category: 'Dairy', reason: 'Paleo principles', strictness: 'limit' }
      ],
      allowedFoods: [
        FoodCategory.Vegetables,
        FoodCategory.Fruits,
        FoodCategory.Proteins,
        FoodCategory.Fats,
        FoodCategory.Nuts,
        FoodCategory.Seeds
      ],
      specialConsiderations: [
        'Focus on quality protein sources',
        'Include healthy fats from natural sources',
        'Emphasize whole, unprocessed foods'
      ]
    };
  }

  /**
   * Create Anti-inflammatory dietary approach
   */
  private createAntiInflammatoryDiet(): DietaryApproach {
    return {
      id: 'anti-inflammatory',
      name: 'Anti-inflammatory Diet',
      description: 'Focuses on foods that reduce inflammation and promote overall health.',
      macroRatios: {
        carbohydrates: { min: 35, target: 40, max: 45 },
        protein: { min: 20, target: 25, max: 30 },
        fat: { min: 30, target: 35, max: 40 }
      },
      mealStructure: {
        mealsPerDay: 4,
        mealDistribution: [
          {
            mealType: MealType.Breakfast,
            macroDistribution: {
              carbohydrates: { min: 35, target: 40, max: 45 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 30, target: 35, max: 40 }
            },
            portionSize: { unit: 'calories', amount: 400 }
          },
          {
            mealType: MealType.Lunch,
            macroDistribution: {
              carbohydrates: { min: 35, target: 40, max: 45 },
              protein: { min: 25, target: 30, max: 35 },
              fat: { min: 30, target: 35, max: 40 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Dinner,
            macroDistribution: {
              carbohydrates: { min: 35, target: 40, max: 45 },
              protein: { min: 25, target: 30, max: 35 },
              fat: { min: 30, target: 35, max: 40 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Snack,
            macroDistribution: {
              carbohydrates: { min: 35, target: 40, max: 45 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 30, target: 35, max: 40 }
            },
            portionSize: { unit: 'calories', amount: 200 }
          }
        ],
        snacksAllowed: true
      },
      nutritionalPriorities: [
        { nutrient: 'Omega-3 fatty acids', importance: 9, reason: 'Anti-inflammatory properties' },
        { nutrient: 'Antioxidants', importance: 9, reason: 'Reduce oxidative stress' },
        { nutrient: 'Fiber', importance: 8, reason: 'Gut health and inflammation reduction' }
      ],
      restrictions: [
        { category: 'ProcessedFoods', reason: 'Often contain inflammatory ingredients', strictness: 'avoid' },
        { category: 'Sugars', reason: 'Can promote inflammation', strictness: 'limit' },
        { category: 'Alcohol', reason: 'Can promote inflammation', strictness: 'limit' }
      ],
      allowedFoods: [
        FoodCategory.Vegetables,
        FoodCategory.Fruits,
        FoodCategory.Grains,
        FoodCategory.Proteins,
        FoodCategory.Fats,
        FoodCategory.Nuts,
        FoodCategory.Seeds,
        FoodCategory.Legumes
      ],
      specialConsiderations: [
        'Emphasize anti-inflammatory spices (turmeric, ginger)',
        'Include fatty fish for omega-3',
        'Focus on colorful fruits and vegetables'
      ]
    };
  }

  /**
   * Create Mediterranean dietary approach
   */
  private createMediterraneanDiet(): DietaryApproach {
    return {
      id: 'mediterranean',
      name: 'Mediterranean Diet',
      description: 'Heart-healthy diet based on traditional Mediterranean eating patterns.',
      macroRatios: {
        carbohydrates: { min: 40, target: 45, max: 50 },
        protein: { min: 15, target: 20, max: 25 },
        fat: { min: 30, target: 35, max: 40 }
      },
      mealStructure: {
        mealsPerDay: 4,
        mealDistribution: [
          {
            mealType: MealType.Breakfast,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 15, target: 20, max: 25 },
              fat: { min: 30, target: 35, max: 40 }
            },
            portionSize: { unit: 'calories', amount: 400 }
          },
          {
            mealType: MealType.Lunch,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 30, target: 35, max: 40 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Dinner,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 30, target: 35, max: 40 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Snack,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 15, target: 20, max: 25 },
              fat: { min: 30, target: 35, max: 40 }
            },
            portionSize: { unit: 'calories', amount: 200 }
          }
        ],
        snacksAllowed: true
      },
      nutritionalPriorities: [
        { nutrient: 'Omega-3 fatty acids', importance: 9, reason: 'Heart health' },
        { nutrient: 'Fiber', importance: 8, reason: 'Digestive health' },
        { nutrient: 'Antioxidants', importance: 8, reason: 'Overall health' }
      ],
      restrictions: [
        { category: 'ProcessedFoods', reason: 'Focus on whole foods', strictness: 'limit' },
        { category: 'Sugars', reason: 'Blood sugar stability', strictness: 'limit' }
      ],
      allowedFoods: [
        FoodCategory.Vegetables,
        FoodCategory.Fruits,
        FoodCategory.Grains,
        FoodCategory.Proteins,
        FoodCategory.Dairy,
        FoodCategory.Fats,
        FoodCategory.Nuts,
        FoodCategory.Seeds,
        FoodCategory.Legumes
      ],
      specialConsiderations: [
        'Emphasize olive oil as primary fat source',
        'Include moderate wine consumption',
        'Focus on fish and seafood'
      ]
    };
  }

  /**
   * Create Flexitarian dietary approach
   */
  private createFlexitarianDiet(): DietaryApproach {
    return {
      id: 'flexitarian',
      name: 'Flexitarian Diet',
      description: 'Primarily plant-based diet with occasional meat consumption.',
      macroRatios: {
        carbohydrates: { min: 45, target: 50, max: 55 },
        protein: { min: 15, target: 20, max: 25 },
        fat: { min: 25, target: 30, max: 35 }
      },
      mealStructure: {
        mealsPerDay: 4,
        mealDistribution: [
          {
            mealType: MealType.Breakfast,
            macroDistribution: {
              carbohydrates: { min: 45, target: 50, max: 55 },
              protein: { min: 15, target: 20, max: 25 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 400 }
          },
          {
            mealType: MealType.Lunch,
            macroDistribution: {
              carbohydrates: { min: 45, target: 50, max: 55 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Dinner,
            macroDistribution: {
              carbohydrates: { min: 45, target: 50, max: 55 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          },
          {
            mealType: MealType.Snack,
            macroDistribution: {
              carbohydrates: { min: 45, target: 50, max: 55 },
              protein: { min: 15, target: 20, max: 25 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 200 }
          }
        ],
        snacksAllowed: true
      },
      nutritionalPriorities: [
        { nutrient: 'Fiber', importance: 9, reason: 'Plant-based nutrition' },
        { nutrient: 'Protein', importance: 8, reason: 'Ensure adequate protein from plant sources' },
        { nutrient: 'Iron', importance: 8, reason: 'Plant-based iron absorption' }
      ],
      restrictions: [
        { category: 'ProcessedFoods', reason: 'Focus on whole foods', strictness: 'limit' },
        { category: 'Meat', reason: 'Flexitarian approach', strictness: 'limit' }
      ],
      allowedFoods: [
        FoodCategory.Vegetables,
        FoodCategory.Fruits,
        FoodCategory.Grains,
        FoodCategory.Proteins,
        FoodCategory.Dairy,
        FoodCategory.Fats,
        FoodCategory.Nuts,
        FoodCategory.Seeds,
        FoodCategory.Legumes
      ],
      specialConsiderations: [
        'Emphasize plant-based protein sources',
        'Include variety for nutritional completeness',
        'Occasional meat consumption is acceptable'
      ]
    };
  }

  /**
   * Create 5:2 dietary approach
   */
  private createFiveTwoDiet(): DietaryApproach {
    return {
      id: '5-2',
      name: '5:2 Intermittent Fasting',
      description: '5 days of normal eating, 2 days of calorie restriction (500 calories for women, 600 for men).',
      macroRatios: {
        carbohydrates: { min: 40, target: 45, max: 50 },
        protein: { min: 20, target: 25, max: 30 },
        fat: { min: 25, target: 30, max: 35 }
      },
      mealStructure: {
        mealsPerDay: 3,
        mealDistribution: [
          {
            mealType: MealType.Breakfast,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 20, target: 25, max: 30 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 300 }
          },
          {
            mealType: MealType.Lunch,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 25, target: 30, max: 35 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 400 }
          },
          {
            mealType: MealType.Dinner,
            macroDistribution: {
              carbohydrates: { min: 40, target: 45, max: 50 },
              protein: { min: 25, target: 30, max: 35 },
              fat: { min: 25, target: 30, max: 35 }
            },
            portionSize: { unit: 'calories', amount: 500 }
          }
        ],
        snacksAllowed: false,
        fastingPeriods: [
          {
            daysPerWeek: 2,
            calorieReduction: 75,
            description: 'Two days per week with 500-600 calories'
          }
        ]
      },
      nutritionalPriorities: [
        { nutrient: 'Protein', importance: 9, reason: 'Preserve muscle mass during fasting' },
        { nutrient: 'Fiber', importance: 8, reason: 'Satiety during fasting days' },
        { nutrient: 'Electrolytes', importance: 7, reason: 'Maintain hydration during fasting' }
      ],
      restrictions: [
        { category: 'ProcessedFoods', reason: 'Focus on nutrient-dense foods', strictness: 'limit' },
        { category: 'Sugars', reason: 'Blood sugar stability', strictness: 'limit' }
      ],
      allowedFoods: [
        FoodCategory.Vegetables,
        FoodCategory.Fruits,
        FoodCategory.Grains,
        FoodCategory.Proteins,
        FoodCategory.Dairy,
        FoodCategory.Fats,
        FoodCategory.Nuts,
        FoodCategory.Seeds,
        FoodCategory.Legumes
      ],
      specialConsiderations: [
        'Special handling required for fasting days',
        'Focus on nutrient-dense foods on fasting days',
        'Normal eating on non-fasting days'
      ]
    };
  }
} 