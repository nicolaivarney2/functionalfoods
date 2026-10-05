/**
 * Scrape-status for den seneste natlige grocery-sync.
 *
 * Kigger på fooddata `sync_logs` siden sidste 02:00 UTC-slot — samme vindue
 * som `grocery-native-sync`. Én række pr. scrape: lykkedes, delvis eller fejlede.
 * Gamle tilbud i databasen tæller ikke som succes, hvis selve scrapen fejlede.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getGroceryServiceClient } from '@/grocery/db/client'
import { NATIVE_CRON_UTC_HOUR } from '@/lib/grocery/sync-schedule'

export type LaunchHealthLevel = 'ok' | 'warn' | 'fail'

export type ScrapeOutcome = 'success' | 'partial' | 'failed' | 'missing'

export type LaunchHealthChain = {
  chain: string
  label: string
  /** Varer skrevet i seneste scrape. Feltnavnet beholdes til admin-siden. */
  rpcCount: number
  sample: string[]
  lastSeenAt: string | null
  daysSinceSeen: number | null
  level: LaunchHealthLevel
  reason: string
  scrapeStatus: ScrapeOutcome
  errorMessage: string | null
}

export type LaunchHealthReport = {
  generatedAt: string
  /** Start på det scrape-vindue rapporten dækker (sidste 02:00 UTC). */
  windowStart: string
  ok: boolean
  failCount: number
  warnCount: number
  chains: LaunchHealthChain[]
}

type ScrapeCheck = {
  chain: string
  label: string
  /** `sync_logs.source`-værdier. Seneste række i vinduet vinder. */
  sources: readonly string[]
}

/** Scrapes som `grocery-native-sync` kører hver nat. */
export const SCRAPE_CHECKS: readonly ScrapeCheck[] = [
  { chain: 'netto', label: 'Netto', sources: ['salling-algolia:netto:leaflet', 'salling-algolia:netto'] },
  { chain: 'foetex', label: 'Føtex', sources: ['salling-algolia:foetex:leaflet', 'salling-algolia:foetex'] },
  { chain: 'bilka', label: 'Bilka', sources: ['salling-algolia:bilka:leaflet', 'salling-algolia:bilka'] },
  { chain: 'rema-1000', label: 'REMA 1000', sources: ['apify-rema', 'rema-1000-api'] },
  { chain: 'nemlig', label: 'Nemlig', sources: ['nemlig-api'] },
  { chain: 'lidl', label: 'Lidl', sources: ['lidl-avis'] },
  { chain: 'meny', label: 'MENY', sources: ['meny-avis'] },
  { chain: 'spar', label: 'SPAR', sources: ['spar-avis'] },
  { chain: 'min-koebmand', label: 'Min Købmand', sources: ['min-koebmand-avis'] },
]

type SyncLogRow = {
  status?: string | null
  started_at?: string | null
  products_processed?: number | null
  offers_processed?: number | null
  error_message?: string | null
  metadata?: { skippedUnchanged?: boolean } | null
}

/** Seneste 02:00 UTC, som er grocery-native-sync'ens faste slot. */
export function lastDailyScrapeSlot(now: Date = new Date()): Date {
  const slot = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      NATIVE_CRON_UTC_HOUR,
      0,
      0,
      0,
    ),
  )
  if (slot.getTime() > now.getTime()) {
    slot.setUTCDate(slot.getUTCDate() - 1)
  }
  return slot
}

export function classifyScrapeLog(row: SyncLogRow | null): {
  level: LaunchHealthLevel
  scrapeStatus: ScrapeOutcome
  reason: string
} {
  if (!row?.status) {
    return { level: 'fail', scrapeStatus: 'missing', reason: 'Scrape kørte ikke' }
  }
  const error = row.error_message?.trim() || null
  if (row.status === 'failed') {
    return { level: 'fail', scrapeStatus: 'failed', reason: error || 'Scrape fejlede' }
  }
  if (row.status === 'partial') {
    return { level: 'warn', scrapeStatus: 'partial', reason: error ? `Delvis: ${error}` : 'Scrape delvist' }
  }
  if (row.status === 'success') {
    return {
      level: 'ok',
      scrapeStatus: 'success',
      reason: row.metadata?.skippedUnchanged ? 'Kørte — avisen var uændret' : 'Kørte',
    }
  }
  return { level: 'warn', scrapeStatus: 'partial', reason: `Ukendt status: ${row.status}` }
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

async function latestLogSince(
  grocery: SupabaseClient,
  sources: readonly string[],
  sinceIso: string,
): Promise<SyncLogRow | null> {
  const { data, error } = await grocery
    .from('sync_logs')
    .select('status, started_at, products_processed, offers_processed, error_message, metadata')
    .in('source', [...sources])
    .gte('started_at', sinceIso)
    .order('started_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`${sources[0]}: ${error.message}`)
  return (data?.[0] as SyncLogRow | undefined) ?? null
}

export async function runDagligvarerLaunchHealth(
  grocery: SupabaseClient = getGroceryServiceClient(),
  now: Date = new Date(),
): Promise<LaunchHealthReport> {
  const windowStart = lastDailyScrapeSlot(now).toISOString()
  const chains: LaunchHealthChain[] = []

  for (const spec of SCRAPE_CHECKS) {
    const row = await latestLogSince(grocery, spec.sources, windowStart)
    const classified = classifyScrapeLog(row)
    const startedAt = row?.started_at ?? null
    const age = daysAgo(startedAt)
    const products = row?.products_processed ?? row?.offers_processed ?? 0
    chains.push({
      chain: spec.chain,
      label: spec.label,
      rpcCount: products,
      sample: [],
      lastSeenAt: startedAt,
      daysSinceSeen: age != null ? Math.round(age * 10) / 10 : null,
      level: classified.level,
      reason: classified.reason,
      scrapeStatus: classified.scrapeStatus,
      errorMessage: row?.error_message?.trim() || null,
    })
  }

  const failCount = chains.filter((c) => c.level === 'fail').length
  const warnCount = chains.filter((c) => c.level === 'warn').length
  return {
    generatedAt: now.toISOString(),
    windowStart,
    ok: failCount === 0,
    failCount,
    warnCount,
    chains,
  }
}

function formatDk(iso: string | null): string {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('da-DK', {
    timeZone: 'Europe/Copenhagen',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function daCount(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function launchHealthEmailSubject(report: LaunchHealthReport): string {
  if (!report.ok) {
    return `[FF dagligvarer] ${daCount(report.failCount, 'scrape fejlede', 'scrapes fejlede')}`
  }
  if (report.warnCount > 0) {
    return `[FF dagligvarer] Scrapes OK (${daCount(report.warnCount, 'delvis', 'delvise')})`
  }
  return '[FF dagligvarer] Alle scrapes kørte'
}

export function formatLaunchHealthReport(report: LaunchHealthReport): string {
  const pad = (s: unknown, n: number) => String(s ?? '').padEnd(n)
  const lines = [
    `Scrape-status  ${formatDk(report.generatedAt)}`,
    `Vindue siden ${formatDk(report.windowStart)} (seneste natlige kørsel)`,
    '',
    pad('kæde', 16) + pad('status', 8) + pad('varer', 8) + pad('kørt', 14) + 'note',
  ]
  for (const c of report.chains) {
    lines.push(
      pad(c.label, 16) +
        pad(c.level, 8) +
        pad(c.rpcCount, 8) +
        pad(formatDk(c.lastSeenAt), 14) +
        c.reason,
    )
  }
  lines.push('')
  if (report.ok && report.warnCount === 0) {
    lines.push('OK — alle scrapes kørte')
  } else if (report.ok) {
    lines.push(`OK — ${daCount(report.warnCount, 'delvis scrape', 'delvise scrapes')}`)
  } else if (report.warnCount === 0) {
    lines.push(`FAIL — ${daCount(report.failCount, 'scrape fejlede', 'scrapes fejlede')}`)
  } else {
    lines.push(
      `FAIL — ${daCount(report.failCount, 'scrape fejlede', 'scrapes fejlede')}, ${daCount(report.warnCount, 'delvis', 'delvise')}`,
    )
  }
  return lines.join('\n')
}
