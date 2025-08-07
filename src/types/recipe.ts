export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  volume?: string;
  notes?: string;
}

export interface IngredientGroup {
  id: string;
  name: string;
  ingredients: Ingredient[];
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  instruction: string;
  time?: number; // in minutes
  tips?: string;
}

export interface InstructionGroup {
  id: string;
  name: string;
  steps: RecipeStep[];
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  
  // Timing
  preparationTime: number; // in minutes
  cookingTime: number; // in minutes
  totalTime: number; // calculated
  
  // Nutrition
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    vitamins?: Record<string, number>;
    minerals?: Record<string, number>;
  };
  
  // SEO
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  
  // Categories
  mainCategory: string; // e.g., "Aftensmad", "Frokost", "Morgenmad"
  subCategories: string[]; // e.g., ["Familie mad", "Nem hverdagsmad"]
  dietaryCategories: string[]; // e.g., ["Keto", "Paleo", "LCHF"]
  
  // Content
  ingredients: Ingredient[];
  ingredientGroups?: IngredientGroup[];
  instructions: RecipeStep[];
  instructionGroups?: InstructionGroup[];
  
  // Media
  imageUrl: string;
  imageAlt: string;
  
  // Additional
  servings: number;
  difficulty: 'Nem' | 'Mellem' | 'Svær';
  author: string;
  publishedAt: Date;
  updatedAt: Date;
  
  // SEO Rich Data
  rating?: number;
  reviewCount?: number;
  prepTimeISO?: string; // ISO 8601 format
  cookTimeISO?: string;
  totalTimeISO?: string;
}

export interface RecipeCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentCategory?: string;
  children?: RecipeCategory[];
  recipeCount: number;
  imageUrl?: string;
}

export interface DietaryCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  recipeCount: number;
} 