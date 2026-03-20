/** Mandag 00:00 lokal tid for ugen der indeholder `d`. */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = x.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + mondayOffset)
  return x
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

export function getSurveyWeekContext(now = new Date()) {
  const thisMonday = startOfWeekMonday(now)
  const prevMonday = addDays(thisMonday, -7)
  return {
    thisMondayStr: formatLocalDate(thisMonday),
    prevMondayStr: formatLocalDate(prevMonday),
  }
}
