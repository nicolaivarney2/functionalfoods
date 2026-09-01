/**
 * Ugedagsplan for Fooddata-sync — baseret på hvornår danske kæder typisk
 * publicerer nye tilbud (samme kalender som Goma i scheduled-sync), men vi
 * henter først **morgenen efter** så kataloget er på plads.
 *
 * Eksempel: Netto/Bilka opdaterer typisk fredag → cron lørdag ~05:00 DK
 * (04:00 UTC vinter). En fredag-nat sync kl. 04:00 ville misse fredag-aften.
 *
 * GitHub Actions `grocery-native-sync.yml` kl. 04:00 UTC — fuldt katalog
 * efter kædens avisdag, plus daglig Salling-avis-refresh og daglig REMA
 * (kataloget er ~1 min; en misset søndag må ikke efterlade ugens avis).
 */

import { TJEK_LEAFLET_OVERLAY_CHAINS, type SourceChain } from '@/grocery/types'

/** Steps the cron orchestrator can run (matches `?only=` ids). */
export type CronSyncStepId =
  | 'netto'
  | 'foetex'
  | 'bilka'
  | 'rema-1000'
  | 'tjek'
  | 'salling-offers'

/** Native scrapes that Vercel grocery-cron kører (ikke Goma/Tjek). */
export type NativeCronChain = 'netto' | 'foetex' | 'bilka' | 'rema-1000'

export const NATIVE_CRON_WEEKDAY: Record<NativeCronChain, number> = {
  foetex: 5,
  netto: 6,
  bilka: 6,
  'rema-1000': 0,
}

/**
 * `sync_logs.source` values that count as a native scrape.
 * REMA-adapteren skriver `apify-rema` (ikke `rema-1000-api`).
 */
export const NATIVE_SYNC_LOG_SOURCES: Record<NativeCronChain, readonly string[]> = {
  netto: ['salling-algolia:netto'],
  foetex: ['salling-algolia:foetex'],
  bilka: ['salling-algolia:bilka'],
  'rema-1000': ['apify-rema', 'rema-1000-api'],
}

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
  // Fredag ← torsdag: Coop + Dagrofa (MENY/Spar/Min Købmand) m.fl. + Føtex (Salling separat)
  5: ['meny', 'spar', 'kvickly', 'superbrugsen', 'loevbjerg', 'min-koebmand'],
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
  5: 'Torsdagens MENY/Coop/Dagrofa (inkl. Min Købmand) + Føtex',
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
  // Salling paper-avis overlay every day (Algolia misses slagtervarer).
  const tjekChains = [
    ...new Set<SourceChain>([
      ...(TJEK_ONLY_BY_CRON_WEEKDAY[cronWeekday] ?? []),
      ...TJEK_LEAFLET_OVERLAY_CHAINS,
    ]),
  ]
  const rema1000 = REMA_BY_CRON_WEEKDAY.has(cronWeekday)

  return {
    cronWeekday,
    labelDa: LABEL_BY_WEEKDAY[cronWeekday] ?? `dag ${cronWeekday}`,
    releaseNoteDa: RELEASE_NOTE_BY_WEEKDAY[cronWeekday] || 'Salling-avis refresh',
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

/**
 * Seneste 04:00 UTC-slot hvis Copenhagen-ugedag matcher `cronWeekday`.
 * Grocery-cron kører `0 4 * * *` — samme tidspunkt som Vercel.
 */
export function lastScheduledCronAt(cronWeekday: number, now: Date = new Date()): Date {
  for (let i = 0; i <= 8; i++) {
    const candidate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i, 4, 0, 0, 0),
    )
    if (candidate.getTime() > now.getTime()) continue
    if (getCopenhagenWeekday(candidate) === cronWeekday) return candidate
  }
  return new Date(0)
}

/** True hvis sidste succes ligger før kædens seneste planlagte cron-slot. */
export function missedLastScheduledSync(
  lastSuccessAt: string | null | undefined,
  cronWeekday: number,
  now: Date = new Date(),
): boolean {
  const slot = lastScheduledCronAt(cronWeekday, now)
  if (slot.getTime() === 0) return false
  if (!lastSuccessAt) return true
  const t = new Date(lastSuccessAt).getTime()
  if (!Number.isFinite(t)) return true
  return t < slot.getTime() - 5 * 60 * 1000
}

/** Flat list of cron `only` step ids for a scheduled day. */
export function scheduledStepIds(
  schedule: ScheduledGrocerySync,
): CronSyncStepId[] {
  const steps: CronSyncStepId[] = []
  for (const c of schedule.sallingChains) {
    steps.push(c)
  }
  // REMA public API er hele kataloget på ~1 min. Kør hver dag — ikke kun
  // søndag — så en hung/failed cron ikke efterlader sidste uges priser.
  steps.push('rema-1000')
  if (schedule.tjekChains.length > 0) steps.push('tjek')
  steps.push('salling-offers')
  return steps
}
