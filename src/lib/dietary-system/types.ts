// Core dietary approach system types

export interface DietaryApproach {
  id: string;
  name: string;
  description: string;
  macroRatios: MacroRatio;
  mealStructure: MealStructure;
  nutritionalPriorities: NutritionalPriority[];
  restrictions: FoodRestriction[];
  allowedFoods: FoodCategory[];
  specialConsiderations?: string[];
}

export interface MacroRatio {
  carbohydrates: Range; // percentage
  protein: Range; // percentage
  fat: Range; // percentage
}

export interface Range {
  min: number;
  target: number;
  max: number;
}

export interface MealStructure {
  mealsPerDay: number;
  mealDistribution: MealDistribution[];
  snacksAllowed: boolean;
  fastingPeriods?: FastingPeriod[];
  optionalBreakfast?: boolean; // For keto/IF approaches
}

export interface MealDistribution {
  mealType: MealType;
  macroDistribution: MacroRatio;
  portionSize: PortionSize;
  timeOfDay?: TimeRange;
  isOptional?: boolean; // For optional meals like breakfast in keto
}

export enum MealType {
  Breakfast = 'breakfast',
  Lunch = 'lunch',
  Dinner = 'dinner',
  Snack = 'snack'
}

export interface FastingPeriod {
  daysPerWeek: number;
  hoursPerDay?: number;
  calorieReduction?: number; // percentage for 5:2 diet
  description?: string;
}

export interface NutritionalPriority {
  nutrient: string;
  importance: number; // 1-10 scale
  targetAmount?: string; // e.g., "2000mg"
  reason?: string;
}

export interface FoodRestriction {
  category: string;
  reason: string;
  strictness: 'avoid' | 'limit' | 'eliminate';
  alternatives?: string[];
}

export enum FoodCategory {
  Vegetables = 'vegetables',
  Fruits = 'fruits',
  Grains = 'grains',
  Proteins = 'proteins',
  Dairy = 'dairy',
  Fats = 'fats',
  Nuts = 'nuts',
  Seeds = 'seeds',
  Legumes = 'legumes',
  ProcessedFoods = 'processed-foods',
  Sugars = 'sugars',
  Alcohol = 'alcohol'
}

export interface PortionSize {
  unit: string;
  amount: number;
  description?: string;
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

// User profile types for calculations
export interface UserProfile {
  gender: 'male' | 'female';
  age: number;
  height: number; // cm
  weight: number; // kg
  activityLevel: ActivityLevel;
  goal: WeightGoal;
  bodyFatPercentage?: number;
}

export enum ActivityLevel {
  Sedentary = 1.2,
  LightlyActive = 1.375,
  ModeratelyActive = 1.55,
  VeryActive = 1.725,
  ExtremelyActive = 1.9
}

export enum WeightGoal {
  WeightLoss = 'weight-loss',
  Maintenance = 'maintenance',
  MuscleGain = 'muscle-gain'
}

// Calculation result types
export interface EnergyNeeds {
  bmr: number;
  tdee: number;
  targetCalories: number;
  deficit: number;
}

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbohydrates: number; // grams
  fat: number; // grams
  proteinPercentage: number;
  carbPercentage: number;
  fatPercentage: number;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Dietary approach specific types
export interface KetoSpecifics {
  ketoneTarget?: number;
  electrolyteFocus: boolean;
  fatAdaptationPeriod?: number; // days
}

export interface FiveTwoSpecifics {
  fastingDays: number[]; // 0-6, where 0 is Monday
  fastingCalories: number;
  normalDayCalories: number;
}

export interface MediterraneanSpecifics {
  wineAllowance?: number; // ml per day
  oliveOilEmphasis: boolean;
  fishFrequency: number; // times per week
}

// Recipe compatibility types
export interface RecipeCompatibility {
  recipeId: string;
  dietaryApproachId: string;
  compatibilityScore: number; // 0-100
  macroAlignment: number; // 0-100
  restrictionViolations: string[];
  recommendations: string[];
} 