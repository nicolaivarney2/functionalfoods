export type MealPlanWeekTarget = 'current' | 'next'

export type WeekInfo = {
  weekStartDate: string
  weekEndDate: string
  weekNumber: number
}

/** Lokal kalenderdato YYYY-MM-DD (undgår UTC-drift fra toISOString). */
export function localIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** Mandag 00:00 for ugen der indeholder refDate (man–søn). */
export function getWeekMonday(refDate: Date = new Date()): Date {
  const d = new Date(refDate)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return d
}

export function getWeekInfoByOffset(offsetWeeks: number = 0, refDate: Date = new Date()): WeekInfo {
  const monday = getWeekMonday(refDate)
  monday.setDate(monday.getDate() + Math.max(0, offsetWeeks) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStartDate: localIsoDate(monday),
    weekEndDate: localIsoDate(sunday),
    weekNumber: isoWeekNumber(monday),
  }
}

export function getWeekInfo(
  target: MealPlanWeekTarget = 'current',
  refDate: Date = new Date(),
): WeekInfo {
  return getWeekInfoByOffset(target === 'next' ? 1 : 0, refDate)
}

/** Fredag–søndag: typisk indkøbsvindue til næste uges madplan. */
export function isWeekendShoppingWindow(refDate: Date = new Date()): boolean {
  const day = refDate.getDay()
  return day === 5 || day === 6 || day === 0
}

export function weekInfoFromStartDate(weekStartDate: string): WeekInfo {
  const monday = new Date(`${weekStartDate}T12:00:00`)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStartDate,
    weekEndDate: localIsoDate(sunday),
    weekNumber: isoWeekNumber(monday),
  }
}
