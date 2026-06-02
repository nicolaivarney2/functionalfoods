import { ActivityLevel } from '@/lib/dietary-system'

/** Samme demo-voksen som madbudget (kvinde, vægttab, Keto). */
export type GuestWeightLogEntry = {
  id: string
  weight_kg: number
  logged_at: string
  notes?: string | null
}

export type GuestWeightAdultProfile = {
  adult_index: number
  display_name: string
  gender: 'female'
  age: number
  height: number
  weight: number
  activity_level: number
  weight_goal: string
  target_weight_kg: number
  weight_goal_target_date: string
  is_complete: boolean
}

const DEMO_START_KG = 82.4
const DEMO_END_KG = 74.9
/** Ca. 2 måneder tilbage fra i dag. */
const DEMO_SPAN_DAYS = 58
const DEMO_POINT_COUNT = 11

/**
 * Støt vægttab over ~2 måneder med små naturlige udsving (ikke helt lineært).
 * Returnerer poster sorteret ældst → nyest.
 */
export function buildGuestWeightLogEntries(): GuestWeightLogEntry[] {
  const entries: GuestWeightLogEntry[] = []
  const today = new Date()
  today.setHours(8, 0, 0, 0)

  for (let i = 0; i < DEMO_POINT_COUNT; i++) {
    const t = DEMO_POINT_COUNT <= 1 ? 1 : i / (DEMO_POINT_COUNT - 1)
    const daysAgo = Math.round((1 - t) * DEMO_SPAN_DAYS)
    const loggedAt = new Date(today)
    loggedAt.setDate(loggedAt.getDate() - daysAgo)

    const trend = DEMO_START_KG + (DEMO_END_KG - DEMO_START_KG) * t
    const wobble =
      i === 2 ? 0.25 : i === 5 ? -0.2 : i === 7 ? 0.15 : i % 4 === 0 ? -0.1 : 0
    const weight_kg = Math.round((trend + wobble) * 10) / 10

    entries.push({
      id: `guest-demo-wt-${i}`,
      weight_kg,
      logged_at: loggedAt.toISOString(),
      notes:
        i === 0
          ? 'Start — keto-plan og madbudget i gang'
          : i === DEMO_POINT_COUNT - 1
            ? 'Fortsat støt udvikling'
            : null,
    })
  }

  return entries.sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  )
}

export const GUEST_WEIGHT_DEMO_ENTRIES = buildGuestWeightLogEntries()

function goalDateIso(monthsAhead: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsAhead)
  return d.toISOString().slice(0, 10)
}

export const GUEST_WEIGHT_DEMO_ADULT: GuestWeightAdultProfile = {
  adult_index: 0,
  display_name: 'Demo',
  gender: 'female',
  age: 38,
  height: 168,
  weight: DEMO_END_KG,
  activity_level: ActivityLevel.ModeratelyActive,
  weight_goal: 'weight-loss',
  target_weight_kg: 72,
  weight_goal_target_date: goalDateIso(4),
  is_complete: true,
}

export const GUEST_WEIGHT_DEMO_SUMMARY = {
  startKg: DEMO_START_KG,
  endKg: DEMO_END_KG,
  totalLossKg: Math.round((DEMO_START_KG - DEMO_END_KG) * 10) / 10,
  spanDays: DEMO_SPAN_DAYS,
}
