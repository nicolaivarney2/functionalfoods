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
  const monday = parsePlanDate(weekStartDate)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStartDate,
    weekEndDate: localIsoDate(sunday),
    weekNumber: isoWeekNumber(monday),
  }
}

export const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

const WEEKDAY_LABELS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']
const WEEKDAY_SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']
const RANGE_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const RANGE_WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn']

/** yyyy-mm-dd som lokal middag. Aldrig `new Date("yyyy-mm-dd")` — det er UTC og kan ryge en dag. */
export function parsePlanDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0)
}

/** 0 = mandag … 6 = søndag. Søndag er 0 i JavaScript, så offset er (getDay() + 6) % 7. */
export function mondayBasedWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function weekdayKeyFromDate(date: Date): WeekdayKey {
  return WEEKDAY_KEYS[mondayBasedWeekdayIndex(date)]
}

/** Mandagens yyyy-mm-dd for den kalenderuge `iso` falder i. */
export function mondayIsoOf(iso: string): string {
  const date = parsePlanDate(iso)
  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayBasedWeekdayIndex(date))
  return localIsoDate(monday)
}

export function addIsoDays(iso: string, days: number): string {
  const date = parsePlanDate(iso)
  date.setDate(date.getDate() + days)
  return localIsoDate(date)
}

export type SpanDay = {
  date: string
  weekday: WeekdayKey
  /** 0 = indkøbsdagen */
  offset: number
}

export type CalendarWeekSpan = WeekInfo & { days: SpanDay[] }

/**
 * Del et indkøb (startdag + antal dage) op i kalenderuger der starter mandag.
 * Lørdag + 7 dage giver lørdag–søndag i den ene uge og mandag–fredag i den næste.
 */
export function groupSpanByCalendarWeek(start: Date, dayCount: number): CalendarWeekSpan[] {
  const count = Math.min(14, Math.max(1, Math.floor(dayCount)))
  const groups = new Map<string, { weekStart: Date; days: SpanDay[] }>()
  for (let i = 0; i < count; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const dow = mondayBasedWeekdayIndex(date)
    const monday = new Date(date)
    monday.setDate(date.getDate() - dow)
    const key = localIsoDate(monday)
    let group = groups.get(key)
    if (!group) {
      group = { weekStart: monday, days: [] }
      groups.set(key, group)
    }
    group.days.push({ date: localIsoDate(date), weekday: WEEKDAY_KEYS[dow], offset: i })
  }
  return [...groups.values()].map((group) => {
    const sunday = new Date(group.weekStart)
    sunday.setDate(group.weekStart.getDate() + 6)
    return {
      weekStartDate: localIsoDate(group.weekStart),
      weekEndDate: localIsoDate(sunday),
      weekNumber: isoWeekNumber(group.weekStart),
      days: group.days,
    }
  })
}

/**
 * Indkøbsdag fra klienten: i går til 21 dage frem.
 * I går er med, fordi telefon og server kan stå i hver sin tidszone omkring midnat.
 */
export function parseAnchoredShopDate(raw: unknown, now = new Date()): Date | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const start = parsePlanDate(raw)
  if (Number.isNaN(start.getTime())) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  const min = new Date(today)
  min.setDate(today.getDate() - 1)
  const max = new Date(today)
  max.setDate(today.getDate() + 21)
  if (start < min || start > max) return null
  return start
}

export function parseDayCount(raw: unknown): number | null {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 14) return null
  return n
}

/** "lør 3. – fre 9. okt" */
export function formatSpanRange(start: Date, dayCount: number): string {
  const end = new Date(start)
  end.setDate(start.getDate() + Math.max(1, Math.floor(dayCount)) - 1)
  const a = mondayBasedWeekdayIndex(start)
  const b = mondayBasedWeekdayIndex(end)
  if (start.getMonth() === end.getMonth()) {
    return `${RANGE_WEEKDAYS[a]} ${start.getDate()}. – ${RANGE_WEEKDAYS[b]} ${end.getDate()}. ${RANGE_MONTHS[end.getMonth()]}`
  }
  return `${RANGE_WEEKDAYS[a]} ${start.getDate()}. ${RANGE_MONTHS[start.getMonth()]} – ${RANGE_WEEKDAYS[b]} ${end.getDate()}. ${RANGE_MONTHS[end.getMonth()]}`
}

export type PlannerDay = {
  /** Dato når planen har et indkøb (lørdag kan findes to gange). Ellers ugedagsnøglen. */
  id: string
  dayKey: WeekdayKey
  weekStartDate: string
  label: string
  shortLabel: string
  date: Date
}

/** Visningsrækkefølge: indkøbsdag og frem, når shop findes. Ellers mandag–søndag. */
export function buildPlannerDays(weekStartDate: string, shop: { date: string; dayCount: number } | null): PlannerDay[] {
  if (shop?.date && shop.dayCount) {
    const start = parsePlanDate(shop.date)
    const count = Math.min(14, Math.max(1, Math.floor(shop.dayCount)))
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const idx = mondayBasedWeekdayIndex(date)
      const monday = new Date(date)
      monday.setDate(date.getDate() - idx)
      return {
        id: localIsoDate(date),
        dayKey: WEEKDAY_KEYS[idx],
        weekStartDate: localIsoDate(monday),
        label: WEEKDAY_LABELS[idx],
        shortLabel: WEEKDAY_SHORT[idx],
        date,
      }
    })
  }
  const monday = parsePlanDate(weekStartDate)
  return WEEKDAY_KEYS.map((dayKey, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return {
      id: dayKey,
      dayKey,
      weekStartDate: weekStartDate.slice(0, 10),
      label: WEEKDAY_LABELS[i],
      shortLabel: WEEKDAY_SHORT[i],
      date,
    }
  })
}
