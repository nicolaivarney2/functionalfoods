// Ingredient tagging system types

export interface IngredientTag {
  id: string;
  name: string;
  category: IngredientCategory;
  exclusions: string[]; // ['pork', 'dairy', 'nuts']
  allergens: string[];
  nutritionalInfo?: NutritionalInfo;
  commonNames: string[]; // Alternative names for the ingredient
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum IngredientCategory {
  Protein = 'protein',
  Vegetable = 'vegetable',
  Fruit = 'fruit',
  Grain = 'grain',
  Dairy = 'dairy',
  Fat = 'fat',
  Spice = 'spice',
  Herb = 'herb',
  Nut = 'nut',
  Seed = 'seed',
  Legume = 'legume',
  ProcessedFood = 'processed-food',
  Sweetener = 'sweetener',
  Beverage = 'beverage',
  Other = 'other'
}

export interface NutritionalInfo {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumPer100g?: number;
  vitamins?: VitaminInfo[];
  minerals?: MineralInfo[];
}

export interface VitaminInfo {
  vitamin: string;
  amountPer100g: number;
  unit: string;
}

export interface MineralInfo {
  mineral: string;
  amountPer100g: number;
  unit: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit: string;
  preparation?: string; // e.g., "chopped", "diced", "raw"
  isOptional?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  categories: RecipeCategory[];
  dietaryApproaches: string[]; // IDs of compatible dietary approaches
  nutritionalInfo: NutritionalInfo;
  images: string[];
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum RecipeCategory {
  Breakfast = 'breakfast',
  Lunch = 'lunch',
  Dinner = 'dinner',
  Snack = 'snack',
  Dessert = 'dessert',
  Appetizer = 'appetizer',
  Soup = 'soup',
  Salad = 'salad',
  MainCourse = 'main-course',
  SideDish = 'side-dish',
  Beverage = 'beverage'
}

// User preference types
export interface UserDietaryPreferences {
  userId: string;
  excludedIngredients: string[]; // Ingredient IDs to exclude
  excludedCategories: string[]; // Category names to exclude
  allergies: string[];
  intolerances: string[];
  dietaryRestrictions: string[]; // e.g., ['vegetarian', 'gluten-free']
  preferredIngredients?: string[]; // Ingredient IDs to prefer
  createdAt: Date;
  updatedAt: Date;
}

// Filtering types
export interface RecipeFilter {
  dietaryApproachId?: string;
  excludedIngredients: string[];
  excludedCategories: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  minServings?: number;
  maxServings?: number;
  categories?: RecipeCategory[];
  maxCalories?: number;
  macroPreferences?: MacroPreferences;
}

export interface MacroPreferences {
  minProtein?: number; // grams
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

// Recipe compatibility types
export interface RecipeCompatibility {
  recipeId: string;
  compatibilityScore: number; // 0-100
  excludedIngredients: string[];
  macroAlignment: number; // 0-100
  preparationTime: number; // minutes
  difficulty: RecipeDifficulty;
  recommendations: string[];
}

export enum RecipeDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard'
}

// Bulk import types
export interface BulkImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: ImportError[];
  warnings: string[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

// Admin management types
export interface IngredientManagement {
  ingredient: IngredientTag;
  usageCount: number; // How many recipes use this ingredient
  lastUsed?: Date;
  isPopular: boolean;
  suggestedTags?: string[];
}

// Search and filtering types
export interface IngredientSearchFilters {
  category?: IngredientCategory;
  isActive?: boolean;
  hasAllergens?: boolean;
  excludedIngredients?: string[];
  searchTerm?: string;
}

export interface RecipeSearchFilters {
  dietaryApproachId?: string;
  categories?: RecipeCategory[];
  prepTimeRange?: { min: number; max: number };
  cookTimeRange?: { min: number; max: number };
  servingsRange?: { min: number; max: number };
  calorieRange?: { min: number; max: number };
  excludedIngredients?: string[];
  searchTerm?: string;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Database schema types (for MongoDB)
export interface IngredientDocument {
  _id?: string;
  id: string;
  name: string;
  category: IngredientCategory;
  exclusions: string[];
  allergens: string[];
  nutritionalInfo?: NutritionalInfo;
  commonNames: string[];
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeDocument {
  _id?: string;
  id: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  categories: RecipeCategory[];
  dietaryApproaches: string[];
  nutritionalInfo: NutritionalInfo;
  images: string[];
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferencesDocument {
  _id?: string;
  userId: string;
  excludedIngredients: string[];
  excludedCategories: string[];
  allergies: string[];
  intolerances: string[];
  dietaryRestrictions: string[];
  preferredIngredients?: string[];
  createdAt: Date;
  updatedAt: Date;
} 