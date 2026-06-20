import {
  dietaryFactory,
  DietaryCalculator,
  ActivityLevel,
  WeightGoal,
  type UserProfile,
} from '@/lib/dietary-system'

export type DailyTargets = {
  calories: number
  protein: number
  carbs: number
  fat: number
  bmr: number
  tdee: number
  dietaryApproach: string | null
}

type SupabaseLike = {
  from: (table: string) => any
}

/** Standard-makrofordeling når brugeren ikke har valgt en kostretning (Sense-lignende). */
const DEFAULT_RATIO = {
  carbohydrates: { min: 40, target: 45, max: 50 },
  protein: { min: 20, target: 25, max: 30 },
  fat: { min: 25, target: 30, max: 35 },
}

/**
 * Beregner dagligt energi-/makromål for en voksen (adultIndex) ud fra den gemte
 * adult_weight_loss_profiles-profil. Samme logik som web's madbudget-side, så app
 * og web viser identiske mål. Returnerer null hvis profilen mangler/ikke er komplet.
 */
export async function computeDailyTargets(
  supabase: SupabaseLike,
  userId: string,
  adultIndex = 0
): Promise<DailyTargets | null> {
  const { data: row } = await supabase
    .from('adult_weight_loss_profiles')
    .select('gender, age, height, weight, activity_level, dietary_approach, weight_goal')
    .eq('user_id', userId)
    .eq('adult_index', adultIndex)
    .single()

  if (!row) return null

  const gender: 'male' | 'female' = row.gender === 'male' ? 'male' : 'female'
  const age = Number(row.age)
  const height = Number(row.height)
  const weight = Number(row.weight)
  const activityLevel = Number(row.activity_level)

  // Uden de basale biometriske tal kan vi ikke regne et meningsfuldt mål.
  if (![age, height, weight, activityLevel].every((n) => Number.isFinite(n) && n > 0)) {
    return null
  }

  const goal =
    row.weight_goal === 'weight-loss'
      ? WeightGoal.WeightLoss
      : row.weight_goal === 'muscle-gain'
        ? WeightGoal.MuscleGain
        : WeightGoal.Maintenance

  const profile: UserProfile = {
    gender,
    age,
    height,
    weight,
    activityLevel: activityLevel as ActivityLevel,
    goal,
  }

  const energy = DietaryCalculator.calculateTargetCalories(profile)
  const diet = row.dietary_approach ? dietaryFactory.getDiet(String(row.dietary_approach)) : undefined
  const macros = diet
    ? DietaryCalculator.calculateDietaryMacroTargets(profile, diet)
    : DietaryCalculator.calculateMacroTargets(energy.targetCalories, DEFAULT_RATIO)

  return {
    calories: energy.targetCalories,
    protein: macros.protein,
    carbs: macros.carbohydrates,
    fat: macros.fat,
    bmr: Math.round(energy.bmr),
    tdee: Math.round(energy.tdee),
    dietaryApproach: diet?.id ?? null,
  }
}
