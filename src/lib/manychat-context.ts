import type { SupabaseClient } from '@supabase/supabase-js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getMealTitle(value: unknown): string | null {
  if (!isRecord(value)) return null
  const title = value.title
  if (typeof title !== 'string') return null
  const trimmed = title.trim()
  return trimmed || null
}

function formatLatestMealPlanSummary(mealPlanData: unknown): string | null {
  if (!isRecord(mealPlanData)) return null

  const dayOrder = [
    { key: 'monday', label: 'Man' },
    { key: 'tuesday', label: 'Tir' },
    { key: 'wednesday', label: 'Ons' },
    { key: 'thursday', label: 'Tor' },
    { key: 'friday', label: 'Fre' },
    { key: 'saturday', label: 'Lør' },
    { key: 'sunday', label: 'Søn' },
  ] as const

  const mealOrder = [
    { key: 'breakfast', label: 'morgen' },
    { key: 'lunch', label: 'frokost' },
    { key: 'dinner', label: 'aftensmad' },
    { key: 'snack', label: 'snack' },
  ] as const

  const lines: string[] = []

  for (const day of dayOrder) {
    const dayData = mealPlanData[day.key]
    if (!isRecord(dayData)) continue

    const mealParts: string[] = []
    for (const meal of mealOrder) {
      const title = getMealTitle(dayData[meal.key])
      if (title) {
        mealParts.push(`${meal.label}: ${title.slice(0, 70)}`)
      }
    }

    if (mealParts.length > 0) {
      lines.push(`${day.label}: ${mealParts.join(', ')}`)
    }
  }

  if (lines.length === 0) return null
  return lines.join(' | ')
}

/**
 * Kort agent-kontekst til ManyChat (max ~1900 tegn). Minimeret — ingen fuld JSON eller journal.
 * Fejl på enkelttabeller ignoreres (manglende tabeller i mindre miljøer).
 */
export async function buildAgentContextSummary(
  supabase: SupabaseClient<any>,
  userId: string
): Promise<string> {
  const chunks: string[] = ['FunctionalFoods-bruger', `ID: ${userId}`]

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('email, role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.email) chunks.push(`Email: ${profile.email}`)
  if (profile?.role && profile.role !== 'user') chunks.push(`Rolle: ${profile.role}`)

  const { data: awl } = await supabase
    .from('adult_weight_loss_profiles')
    .select('dietary_approach, target_weight_kg, weight, weight_goal, display_name')
    .eq('user_id', userId)
    .eq('adult_index', 0)
    .maybeSingle()

  if (awl) {
    if (awl.display_name) chunks.push(`Kaldenavn: ${String(awl.display_name).slice(0, 40)}`)
    if (awl.dietary_approach) chunks.push(`Kost/niche: ${String(awl.dietary_approach).slice(0, 80)}`)
    if (awl.weight_goal) chunks.push(`Vægtmål (tekst): ${String(awl.weight_goal).slice(0, 60)}`)
    if (awl.weight != null) chunks.push(`Vægt (profil): ${awl.weight} kg`)
    if (awl.target_weight_kg != null) chunks.push(`Målvægt: ${awl.target_weight_kg} kg`)
  }

  const { data: lastEntry } = await supabase
    .from('weight_log_entries')
    .select('weight_kg, logged_at')
    .eq('user_id', userId)
    .eq('adult_index', 0)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastEntry?.weight_kg != null) {
    const d = lastEntry.logged_at ? String(lastEntry.logged_at).slice(0, 10) : ''
    chunks.push(`Seneste logget vægt: ${lastEntry.weight_kg} kg${d ? ` (${d})` : ''}`)
  }

  const { data: lastPlan } = await supabase
    .from('user_meal_plans')
    .select('week_start_date, week_number, updated_at, meal_plan_data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastPlan) {
    const label =
      lastPlan.week_start_date != null
        ? `start ${String(lastPlan.week_start_date).slice(0, 10)}`
        : lastPlan.week_number != null
          ? `uge ${lastPlan.week_number}`
          : 'gemt'
    chunks.push(`Seneste madplan: ${label}`)

    const detailedMealPlan = formatLatestMealPlanSummary(lastPlan.meal_plan_data)
    if (detailedMealPlan) {
      chunks.push(`Seneste madplan (retter): ${detailedMealPlan}`)
    }
  }

  return chunks.join(' · ').slice(0, 1900)
}
