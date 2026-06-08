import { ActivityLevel, DietaryCalculator, UserProfile, WeightGoal } from '@/lib/dietary-system'
import { DIETARY_APPROACH_OPTIONS } from '@/lib/dietary-approach-options'
import { MADBUDGET_STORE_CATALOG } from '@/lib/madbudget-stores'

export const ONBOARDING_STORAGE_KEY = 'ff_vaegttabsplan_onboarding_v1'

/** @deprecated Use DIETARY_APPROACH_OPTIONS — kept for existing imports */
export const ONBOARDING_DIETARY_OPTIONS = DIETARY_APPROACH_OPTIONS

export const ACTIVITY_OPTIONS = [
  { value: ActivityLevel.Sedentary, label: 'Stillesiddende', hint: 'Lidt eller ingen motion' },
  { value: ActivityLevel.LightlyActive, label: 'Lidt aktiv', hint: 'Let motion 1–3 dage/uge' },
  { value: ActivityLevel.ModeratelyActive, label: 'Moderat aktiv', hint: 'Motion 3–5 dage/uge' },
  { value: ActivityLevel.VeryActive, label: 'Meget aktiv', hint: 'Hård motion 6–7 dage/uge' },
  { value: ActivityLevel.ExtremelyActive, label: 'Ekstremt aktiv', hint: 'Meget hård motion / fysisk arbejde' },
] as const

export const WEIGHT_GOAL_OPTIONS = [
  { value: WeightGoal.WeightLoss, label: 'Tabe mig', desc: 'Struktureret kalorieunderskud', icon: '📉' },
  { value: WeightGoal.Maintenance, label: 'Holde vægten', desc: 'Vedligehold og spis sundere', icon: '⚖️' },
  { value: WeightGoal.MuscleGain, label: 'Tage på', desc: 'Byg styrke og muskelmasse', icon: '💪' },
] as const

export const EXCLUDED_FOOD_OPTIONS = [
  { id: 'red-meat', label: 'Rødt kød' },
  { id: 'poultry', label: 'Fjerkræ' },
  { id: 'pork', label: 'Svinekød' },
  { id: 'fish', label: 'Fisk' },
  { id: 'eggs', label: 'Æg' },
  { id: 'shellfish', label: 'Skaldyr' },
  { id: 'nuts', label: 'Nødder' },
  { id: 'dairy', label: 'Mælkeprodukter' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'soy', label: 'Soja' },
] as const

export type MealPlanScope = 'full' | 'dinner-only'

export const MEAL_PLAN_SCOPE_OPTIONS = [
  {
    id: 'full' as const,
    label: 'Fuld plan',
    desc: 'Morgenmad, frokost og aftensmad — hele dagen er planlagt for dig.',
    icon: '🍽️',
  },
  {
    id: 'dinner-only' as const,
    label: 'Kun aftensmad',
    desc: 'Vi planlægger aftensmaden — du logger morgenmad og frokost løbende selv.',
    icon: '🌙',
  },
] as const

export function mealsPerDayFromScope(scope: MealPlanScope): string[] {
  return scope === 'full' ? ['breakfast', 'lunch', 'dinner'] : ['dinner']
}

export function mealPlanScopeLabel(scope?: MealPlanScope): string {
  if (scope === 'full') return 'Morgenmad, frokost og aftensmad'
  if (scope === 'dinner-only') return 'Kun aftensmad'
  return '—'
}

export type VaegttabsplanOnboardingData = {
  version: 2
  currentStep: number
  weightGoal?: WeightGoal
  gender?: 'male' | 'female'
  age?: number
  height?: number
  weight?: number
  activityLevel?: ActivityLevel
  dietaryApproach?: string
  mealPlanScope?: MealPlanScope
  selectedStores: number[]
  excludedFoods: string[]
  name?: string
  email?: string
}

export function defaultOnboardingData(): VaegttabsplanOnboardingData {
  return {
    version: 2,
    currentStep: 0,
    selectedStores: [1, 2],
    excludedFoods: [],
  }
}

/** Map saved step index from v1 wizard (combined profile step) to v2 one-field-per-step flow. */
export function migrateOnboardingStep(
  savedStep: number,
  data: Pick<
    VaegttabsplanOnboardingData,
    'gender' | 'age' | 'height' | 'weight' | 'activityLevel'
  >
): number {
  if (savedStep <= 1) return savedStep
  if (savedStep === 2) {
    if (!data.gender) return 2
    if (!data.age || data.age <= 0) return 3
    if (!data.height || data.height <= 40) return 4
    if (!data.weight || data.weight <= 25) return 5
    if (data.activityLevel == null) return 6
    return 7
  }
  if (savedStep >= 3) return savedStep + 4
  return savedStep
}

export function loadOnboardingData(): VaegttabsplanOnboardingData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (!raw) return null
    type StoredOnboarding = Omit<Partial<VaegttabsplanOnboardingData>, 'version'> & { version?: number }
    const parsed = JSON.parse(raw) as StoredOnboarding
    const savedVersion = parsed.version
    if (savedVersion != null && savedVersion !== 1 && savedVersion !== 2) return null
    const merged: VaegttabsplanOnboardingData = {
      ...defaultOnboardingData(),
      ...parsed,
      version: 2,
      selectedStores: parsed.selectedStores ?? [1, 2],
      excludedFoods: parsed.excludedFoods ?? [],
    }
    if (savedVersion === 1) {
      merged.currentStep = migrateOnboardingStep(parsed.currentStep ?? 0, merged)
    }
    return merged
  } catch {
    return null
  }
}

export function saveOnboardingData(data: VaegttabsplanOnboardingData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

export function clearOnboardingData(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function hasPendingOnboardingData(): boolean {
  const data = loadOnboardingData()
  return Boolean(data && onboardingProfileComplete(data))
}

export function onboardingProfileComplete(data: VaegttabsplanOnboardingData): boolean {
  return Boolean(
    data.weightGoal &&
      data.gender &&
      data.age &&
      data.height &&
      data.weight &&
      data.activityLevel != null &&
      data.dietaryApproach &&
      data.mealPlanScope &&
      data.selectedStores.length > 0
  )
}

export function calculateOnboardingEnergy(data: VaegttabsplanOnboardingData) {
  if (
    !data.gender ||
    !data.age ||
    !data.height ||
    !data.weight ||
    data.activityLevel == null ||
    !data.weightGoal
  ) {
    return null
  }
  const profile: UserProfile = {
    gender: data.gender,
    age: data.age,
    height: data.height,
    weight: data.weight,
    activityLevel: data.activityLevel,
    goal: data.weightGoal,
  }
  return DietaryCalculator.calculateTargetCalories(profile)
}

export async function applyPendingOnboarding(accessToken: string): Promise<boolean> {
  const data = loadOnboardingData()
  if (!data || !onboardingProfileComplete(data)) return false

  const res = await fetch('/api/madbudget/family-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      familyProfile: {
        adults: 1,
        children: 0,
        childrenAges: [],
        prioritizeOrganic: false,
        prioritizeAnimalOrganic: false,
        excludedIngredients: data.excludedFoods ?? [],
        selectedStores: data.selectedStores.length ? data.selectedStores : [1, 2],
        variationLevel: 2,
      },
      adultProfiles: [
        {
          gender: data.gender,
          age: data.age,
          height: data.height,
          weight: data.weight,
          activityLevel: data.activityLevel,
          dietaryApproach: data.dietaryApproach,
          mealsPerDay: data.mealPlanScope ? mealsPerDayFromScope(data.mealPlanScope) : ['dinner'],
          weightGoal: data.weightGoal,
          isComplete: true,
        },
      ],
    }),
  })

  if (!res.ok) return false
  clearOnboardingData()
  return true
}

export function storeName(id: number): string {
  return MADBUDGET_STORE_CATALOG.find((s) => s.id === id)?.name ?? `Butik ${id}`
}
