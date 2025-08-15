// Meal plan generation system types

import { UserProfile, DietaryApproach, MacroTargets, EnergyNeeds } from '../dietary-system';
import { Recipe, RecipeFilter } from '../ingredient-system';

export interface MealPlan {
  id: string;
  userId: string;
  userProfile: UserProfile;
  dietaryApproach: DietaryApproach;
  energyNeeds: EnergyNeeds;
  macroTargets: MacroTargets;
  weeks: WeekPlan[];
  excludedIngredients: string[];
  excludedCategories: string[];
  allergies: string[];
  intolerances: string[];
  nutritionalAssessment: NutritionalAssessment;
  createdAt: Date;
  updatedAt: Date;
  status: MealPlanStatus;
}

export interface WeekPlan {
  weekNumber: number;
  days: DayPlan[];
  shoppingList: ShoppingList;
  weeklyNutrition: WeeklyNutrition;
}

export interface DayPlan {
  date: Date;
  meals: MealAssignment[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  // Micro-nutrition totals (optional)
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  notes?: string;
}

export interface MealAssignment {
  mealType: MealType;
  recipe: Recipe;
  servings: number;
  adjustedCalories: number;
  adjustedProtein: number;
  adjustedCarbs: number;
  adjustedFat: number;
  // Micro-nutrition (optional)
  adjustedFiber?: number;
  adjustedSugar?: number;
  adjustedSodium?: number;
  adjustedVitamins?: { [key: string]: number };
  adjustedMinerals?: { [key: string]: number };
  preparationNotes?: string;
  substitutionNotes?: string;
}

export enum MealType {
  Breakfast = 'breakfast',
  Lunch = 'lunch',
  Dinner = 'dinner',
  Snack = 'snack'
}

export interface ShoppingList {
  weekNumber: number;
  categories: ShoppingCategory[];
  totalEstimatedCost?: number;
  notes?: string;
}

export interface ShoppingCategory {
  name: string;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  name: string;
  amount: number;
  unit: string;
  estimatedCost?: number;
  notes?: string;
  isOptional?: boolean;
}

export interface WeeklyNutrition {
  averageDailyCalories: number;
  averageDailyProtein: number;
  averageDailyCarbs: number;
  averageDailyFat: number;
  // Micro-nutrition daily averages (optional)
  averageDailyFiber?: number;
  averageDailySugar?: number;
  averageDailySodium?: number;
  totalWeeklyCalories: number;
  nutritionGoals: NutritionGoals;
  deficiencies: NutritionalDeficiency[];
  recommendations: string[];
  // Weekly totals for vitamins/minerals (optional)
  vitaminTotals?: { [key: string]: number };
  mineralTotals?: { [key: string]: number };
  strengths?: MicroStrength[];
}

export interface MicroStrength {
  nutrient: string;
  coverage: number; // ratio of dailyAverage/targetAmount (e.g., 1.3 = 130%)
  unit: string;
  dailyAverage: number;
  targetAmount: number;
}

export interface NutritionGoals {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber?: number;
  targetSodium?: number;
}

export interface NutritionalDeficiency {
  nutrient: string;
  currentAmount: number;
  targetAmount: number;
  unit: string;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface NutritionalAssessment {
  energyLevel: string;
  symptoms: string[];
  potentialDeficiencies: string[];
  quickWins: string[];
  recommendations: string[];
}

export enum MealPlanStatus {
  Draft = 'draft',
  Generated = 'generated',
  Reviewed = 'reviewed',
  Approved = 'approved',
  Finalized = 'finalized'
}

// Meal plan generation configuration
export interface MealPlanConfig {
  targetCalories: number;
  macroTargets: MacroTargets;
  dietaryApproach: DietaryApproach;
  excludedIngredients: string[];
  excludedCategories: string[];
  allergies: string[];
  intolerances: string[];
  mealStructure: MealStructureConfig;
  varietyPreferences: VarietyPreferences;
  difficultyLevel: DifficultyLevel;
  timeConstraints: TimeConstraints;
}

export interface MealStructureConfig {
  mealsPerDay: number;
  mealDistribution: MealDistributionConfig[];
  snacksAllowed: boolean;
  fastingDays?: number[]; // For 5:2 diet
  optionalBreakfast?: boolean; // For keto/IF
}

export interface MealDistributionConfig {
  mealType: MealType;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  timeRange?: TimeRange;
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface VarietyPreferences {
  maxRepeatDays: number; // Max consecutive days with same recipe
  preferredCuisines: string[];
  avoidCuisines: string[];
  seasonalPreferences: SeasonalPreference[];
}

export interface SeasonalPreference {
  season: string;
  preferredIngredients: string[];
  avoidIngredients: string[];
}

export enum DifficultyLevel {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard'
}

export interface TimeConstraints {
  maxPrepTime: number; // minutes
  maxCookTime: number; // minutes
  preferredCookingDays: string[]; // ['monday', 'wednesday', 'friday']
  batchCookingAllowed: boolean;
}

// Recipe selection and scoring
export interface RecipeScore {
  recipe: Recipe;
  score: number;
  reasons: string[];
  compatibility: RecipeCompatibility;
}

export interface RecipeCompatibility {
  macroAlignment: number; // 0-100
  ingredientCompatibility: number; // 0-100
  timeCompatibility: number; // 0-100
  varietyScore: number; // 0-100
  overallScore: number; // 0-100
}

// Meal plan optimization
export interface OptimizationCriteria {
  macroBalance: number; // Weight for macro balance (0-1)
  variety: number; // Weight for recipe variety (0-1)
  timeEfficiency: number; // Weight for time efficiency (0-1)
  costEfficiency: number; // Weight for cost efficiency (0-1)
  nutritionalDensity: number; // Weight for nutritional density (0-1)
}

export interface MealPlanOptimization {
  criteria: OptimizationCriteria;
  iterations: number;
  convergenceThreshold: number;
  maxExecutionTime: number; // seconds
}

// Validation and quality assurance
export interface MealPlanValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  type: 'critical' | 'error';
  message: string;
  location: string; // e.g., 'week1.day3.breakfast'
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'warning' | 'info';
  message: string;
  location: string;
  impact: 'low' | 'medium' | 'high';
}

// Export and delivery
export interface MealPlanExport {
  format: ExportFormat;
  includeNutritionalInfo: boolean;
  includeShoppingLists: boolean;
  includePreparationNotes: boolean;
  includeSubstitutions: boolean;
  customizations: ExportCustomization[];
}

export enum ExportFormat {
  PDF = 'pdf',
  JSON = 'json',
  CSV = 'csv',
  HTML = 'html'
}

export interface ExportCustomization {
  section: string;
  enabled: boolean;
  content?: string;
}

// Database types for persistence
export interface MealPlanDocument {
  _id?: string;
  id: string;
  userId: string;
  userProfile: UserProfile;
  dietaryApproach: DietaryApproach;
  energyNeeds: EnergyNeeds;
  macroTargets: MacroTargets;
  weeks: WeekPlan[];
  excludedIngredients: string[];
  excludedCategories: string[];
  allergies: string[];
  intolerances: string[];
  nutritionalAssessment: NutritionalAssessment;
  createdAt: Date;
  updatedAt: Date;
  status: MealPlanStatus;
}

// Analytics and tracking
export interface MealPlanAnalytics {
  planId: string;
  generationTime: number; // milliseconds
  recipeCount: number;
  uniqueRecipes: number;
  averagePrepTime: number;
  averageCookTime: number;
  estimatedCost: number;
  nutritionalCompliance: number; // 0-100
  varietyScore: number; // 0-100
  userSatisfaction?: number; // 1-5 rating
}

// Quick wins and nutritional insights
export interface QuickWin {
  type: 'nutritional' | 'lifestyle' | 'recipe';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  implementation: string;
  expectedBenefit: string;
}

export interface NutritionalInsight {
  nutrient: string;
  currentLevel: number;
  targetLevel: number;
  unit: string;
  status: 'deficient' | 'adequate' | 'optimal' | 'excessive';
  recommendations: string[];
  quickWins: QuickWin[];
} 