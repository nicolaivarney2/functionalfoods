import { dietaryApproachLabel } from '@/lib/dietary-approach-options'

export type CommunityRoomStatus = 'open' | 'active' | 'archived'
export type CommunityMessageKind = 'user' | 'system' | 'guidance'

export type CommunityRoomRow = {
  id: string
  niche: string
  title: string | null
  start_date: string
  capacity: number
  duration_days: number
  member_count: number
  status: CommunityRoomStatus
  created_at: string
}

export type CommunityMessageRow = {
  id: string
  room_id: string
  user_id: string | null
  author_name: string
  kind: CommunityMessageKind
  body: string
  day_offset: number | null
  created_at: string
}

export type CommunityTemplateRow = {
  id: string
  niche: string
  trigger: 'on_join' | 'day'
  day_offset: number | null
  /** Lokal tid i Danmark, fx 08:00:00. Kun dag-beskeder. */
  send_time: string | null
  body: string
}

const MENTION_RE = /@([a-z0-9_]{2,32})/gi

export function copenhagenTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function diffDaysIso(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/** Startdato + antal dage, klokken i Danmark, som et UTC-tidspunkt. */
export function copenhagenLocalToUtc(isoDate: string, hhmm: string): Date {
  const [y, mo, d] = isoDate.split('-').map(Number)
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})/)
  const hh = match ? Number(match[1]) : 8
  const mm = match ? Number(match[2]) : 0
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, hh, mm, 0))
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Copenhagen',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const parts = Object.fromEntries(formatter.formatToParts(utcGuess).map((p) => [p.type, p.value]))
  let hour = Number(parts.hour)
  if (hour === 24) hour = 0
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute))
  const offset = asUtc - utcGuess.getTime()
  return new Date(utcGuess.getTime() - offset)
}

export function roomStatusForDates(
  startDate: string,
  durationDays: number,
  today = copenhagenTodayIso()
): CommunityRoomStatus {
  if (today < startDate) return 'open'
  if (diffDaysIso(startDate, today) >= durationDays) return 'archived'
  return 'active'
}

export function renderCommunityTemplate(
  body: string,
  vars: { niche: string; members: string; startDate?: string }
): string {
  return body
    .replaceAll('{{niche}}', dietaryApproachLabel(vars.niche))
    .replaceAll('{{members}}', vars.members || 'ingen endnu — du er den første')
    .replaceAll('{{start_date}}', vars.startDate ?? '')
}

export function extractMentionHandles(body: string): string[] {
  const found = new Set<string>()
  for (const match of body.matchAll(MENTION_RE)) {
    found.add(match[1].toLowerCase())
  }
  return [...found]
}

export function nextMondayIso(today = copenhagenTodayIso()): string {
  const [y, m, d] = today.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay() // 0 søn
  const add = dow === 1 ? 7 : (8 - dow) % 7
  dt.setUTCDate(dt.getUTCDate() + add)
  return dt.toISOString().slice(0, 10)
}
