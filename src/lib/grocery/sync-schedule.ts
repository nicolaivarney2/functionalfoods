/**
 * Ugedagsplan for Fooddata-sync — baseret på hvornår danske kæder typisk
 * publicerer nye tilbud (samme kalender som Goma i scheduled-sync), men vi
 * henter først **morgenen efter** så kataloget er på plads.
 *
 * Eksempel: Netto/Bilka opdaterer typisk fredag → cron lørdag ~05:00 DK
 * (04:00 UTC vinter). En fredag-nat sync kl. 04:00 ville misse fredag-aften.
 *
 * Vercel cron: `0 4 * * *` — route vælger dagens kæder via getScheduledSyncForNow().
 */

import type { SourceChain } from '@/grocery/types'

/** Steps the cron orchestrator can run (matches `?only=` ids). */
export type CronSyncStepId = 'netto' | 'foetex' | 'bilka' | 'rema-1000' | 'tjek'

export interface ScheduledGrocerySync {
  /** 0 = søndag … 6 = lørdag (Europe/Copenhagen). */
  cronWeekday: number
  /** Kort dansk label for log/respons. */
  labelDa: string
  /** Hvilken ugedag kæderne typisk fik nye tilbud (dagen før). */
  releaseNoteDa: string
  sallingChains: Array<'netto' | 'foetex' | 'bilka'>
  rema1000: boolean
  /** Subset til Tjek; tom = ingen Tjek den dag. */
  tjekChains: SourceChain[]
}

const TJEK_ONLY_BY_CRON_WEEKDAY: Record<number, SourceChain[]> = {
  // Onsdag morgen ← tirsdagens ABC Lavpris
  3: ['abc-lavpris'],
  // Torsdag ← onsdagens 365discount
  4: ['365discount'],
  // Fredag ← torsdag: Coop + MENY m.fl. + Føtex (Salling separat)
  5: ['meny', 'spar', 'kvickly', 'superbrugsen', 'loevbjerg'],
  // Lørdag ← fredag: Netto/Bilka (Salling) + Brugsen
  6: ['brugsen'],
  // Søndag ← lørdag: REMA + Lidl
  0: ['lidl'],
  // Mandag ← søndag: Nemlig (Tjek har sjældent data — billig no-op)
  1: ['nemlig'],
}

const SALLING_BY_CRON_WEEKDAY: Record<number, Array<'netto' | 'foetex' | 'bilka'>> = {
  5: ['foetex'],
  6: ['netto', 'bilka'],
}

const REMA_BY_CRON_WEEKDAY: ReadonlySet<number> = new Set([0]) // søndag morgen ← lørdagens REMA

const LABEL_BY_WEEKDAY: Record<number, string> = {
  0: 'Søndag',
  1: 'Mandag',
  2: 'Tirsdag',
  3: 'Onsdag',
  4: 'Torsdag',
  5: 'Fredag',
  6: 'Lørdag',
}

const RELEASE_NOTE_BY_WEEKDAY: Record<number, string> = {
  0: 'Lørdagens REMA 1000 + Lidl',
  1: 'Søndagens Nemlig',
  3: 'Tirsdagens ABC Lavpris',
  4: 'Onsdagens 365discount',
  5: 'Torsdagens MENY/Coop + Føtex',
  6: 'Fredagens Netto/Bilka + Brugsen',
}

/** Danish weekday in Europe/Copenhagen (0 = Sunday). */
export function getCopenhagenWeekday(date: Date = new Date()): number {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Copenhagen',
    weekday: 'short',
  }).format(date)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[short] ?? 0
}

export function getScheduledSyncForWeekday(
  cronWeekday: number,
): ScheduledGrocerySync | null {
  const sallingChains = SALLING_BY_CRON_WEEKDAY[cronWeekday] ?? []
  const tjekChains = TJEK_ONLY_BY_CRON_WEEKDAY[cronWeekday] ?? []
  const rema1000 = REMA_BY_CRON_WEEKDAY.has(cronWeekday)

  if (sallingChains.length === 0 && tjekChains.length === 0 && !rema1000) {
    return null
  }

  return {
    cronWeekday,
    labelDa: LABEL_BY_WEEKDAY[cronWeekday] ?? `dag ${cronWeekday}`,
    releaseNoteDa: RELEASE_NOTE_BY_WEEKDAY[cronWeekday] ?? '',
    sallingChains,
    rema1000,
    tjekChains,
  }
}

export function getScheduledSyncForNow(
  date: Date = new Date(),
): ScheduledGrocerySync | null {
  return getScheduledSyncForWeekday(getCopenhagenWeekday(date))
}

/** Flat list of cron `only` step ids for a scheduled day. */
export function scheduledStepIds(
  schedule: ScheduledGrocerySync,
): CronSyncStepId[] {
  const steps: CronSyncStepId[] = []
  for (const c of schedule.sallingChains) {
    steps.push(c)
  }
  if (schedule.rema1000) steps.push('rema-1000')
  if (schedule.tjekChains.length > 0) steps.push('tjek')
  return steps
}
