import { ActivityLevel } from '@/lib/dietary-system/types'

export interface UserProfile {
  id: string
  email: string
  fullName?: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
  heightCm?: number
  weightKg?: number
  weight?: number // alias for weightKg
  activityLevel?: ActivityLevel
  goals?: string[]
  dietaryRestrictions?: string[]
  allergies?: string[]
  medicalConditions?: string[]
  targetCalories?: number
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  userId: string
  preferredCuisines?: string[]
  dislikedIngredients?: string[]
  maxCookingTime?: number
  budgetRange?: {
    min: number
    max: number
  }
  servingSize?: number
  mealPlanLength?: number // weeks
  createdAt: string
  updatedAt: string
}

export interface UserMetrics {
  userId: string
  date: string
  weightKg?: number
  bodyFatPercentage?: number
  muscleMassKg?: number
  waterPercentage?: number
  notes?: string
  createdAt: string
}

export interface UserGoal {
  id: string
  userId: string
  type: 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintenance' | 'performance'
  targetValue?: number
  targetDate?: string
  isActive: boolean
  progress: Array<{
    date: string
    value: number
    notes?: string
  }>
  createdAt: string
  updatedAt: string
}