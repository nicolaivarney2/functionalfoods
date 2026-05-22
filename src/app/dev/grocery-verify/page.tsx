/**
 * Grocery service verification dashboard.
 *
 * NOT in sitemap, NOT indexable. Internal QA tool used to verify that the
 * daily sync infrastructure stays consistent. Verified 22. maj 2026 at we
 * have 100% coverage of each chain's official source API — going forward
 * this dashboard primarily detects regressions (coverage drops, sync errors,
 * canary price drift).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getChainHealth,
  getCanaryHistory,
  getSourceCoverage,
  pickCanaries,
  type ChainHealth,
  type CanaryHistory,
  type SourceCoverage,
  type TrackedChain,
} from '@/grocery/verification/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Grocery Verify (internal)',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

const TRACKED_CHAINS: TrackedChain[] = ['netto', 'foetex', 'bilka', 'rema-1000']

function chainLabel(c: TrackedChain): string {
  return c === 'rema-1000' ? 'REMA 1000' : c.charAt(0).toUpperCase() + c.slice(1)
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('da-DK', {
    day: '2-digit',
    month: 'short',
  })
}

function formatKr(n: number | null): string {
  if (n == null) return '—'
  if (n >= 100) return n.toFixed(0)
  return n.toFixed(2)
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}t`
  return `${Math.round(mins / 1440)}d`
}

export default async function GroceryVerifyPage() {
  if (process.env.GROCERY_SUPABASE_URL == null) notFound()

  const [chainHealth, canaries, coverage] = await Promise.all([
    getChainHealth(),
    pickCanaries(9),
    getSourceCoverage().catch((err) => {
      console.error('[grocery-verify] getSourceCoverage failed:', err)
      return null
    }),
  ])
  const histories = await getCanaryHistory(canaries, 14)

  const failingCoverage = (coverage ?? []).filter((c) => c.status === 'fail').length
  const warningCoverage = (coverage ?? []).filter((c) => c.status === 'warn').length
  const overallOk = coverage != null && failingCoverage === 0 && warningCoverage === 0

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-baseline justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Grocery verify</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Daglig sync-health. Goma-sammenligning afsluttet 22. maj 2026 — vi har 100%
              kilde-coverage. Dashboard'et detekterer nu regressioner.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              overallOk
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : failingCoverage > 0
                  ? 'bg-rose-50 text-rose-700 ring-rose-200'
                  : 'bg-amber-50 text-amber-800 ring-amber-200'
            }`}
          >
            {overallOk ? 'Alt OK' : failingCoverage > 0 ? `${failingCoverage} fejl` : `${warningCoverage} advarsel`}
          </span>
        </header>

        {coverage && (
          <section className="mb-6">
            <SectionTitle>Source coverage (live probe)</SectionTitle>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Kæde</th>
                    <th className="px-4 py-2 text-right font-medium">Kilden har</th>
                    <th className="px-4 py-2 text-right font-medium">Vi har</th>
                    <th className="px-4 py-2 text-right font-medium">Coverage</th>
                    <th className="px-4 py-2 text-right font-medium">Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((c) => {
                    const health = chainHealth.find((h) => h.chain === c.chain)
                    return <CoverageRow key={c.chain} c={c} health={health} />
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Canary-produkter — 14 dages prishistorik</SectionTitle>
          {histories.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Ingen canary-produkter fundet. Sync er sandsynligvis ikke kørt endnu.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {histories.map((h) => (
                <CanaryGrid key={h.canary.gtin} hist={h} />
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-3 text-xs text-slate-400">
          Genereret {new Date().toLocaleString('da-DK')} · Cache 5 min · Coverage probes ramt
          kilde-API'erne live (Algolia + REMA)
        </footer>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </h2>
  )
}

function CoverageRow({ c, health }: { c: SourceCoverage; health: ChainHealth | undefined }) {
  const toneByStatus = {
    ok: 'text-emerald-700',
    warn: 'text-amber-700',
    fail: 'text-rose-700',
  }[c.status]

  const syncBadge =
    health?.lastSyncStatus === 'success'
      ? 'text-emerald-600'
      : health?.lastSyncStatus === 'failed'
        ? 'text-rose-600'
        : 'text-amber-600'

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2 font-medium text-slate-900">{chainLabel(c.chain)}</td>
      <td className="px-4 py-2 text-right font-mono text-slate-700">
        {c.sourceCount?.toLocaleString('da-DK') ?? '— (probe fejl)'}
      </td>
      <td className="px-4 py-2 text-right font-mono text-slate-700">
        {c.ourCount.toLocaleString('da-DK')}
      </td>
      <td className={`px-4 py-2 text-right font-mono font-semibold ${toneByStatus}`}>
        {c.coveragePct != null ? `${c.coveragePct}%` : '—'}
      </td>
      <td className="px-4 py-2 text-right text-xs">
        <span className={syncBadge}>{health?.lastSyncStatus ?? '—'}</span>
        <span className="ml-2 text-slate-400">{timeAgo(health?.lastSyncAt ?? null)}</span>
      </td>
    </tr>
  )
}

function CanaryGrid({ hist }: { hist: CanaryHistory }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 min-w-0">
        <div className="truncate text-sm font-medium text-slate-900" title={hist.canary.name}>
          {hist.canary.name}
        </div>
        <div className="font-mono text-[10px] text-slate-400">{hist.canary.gtin}</div>
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-slate-400">
            <th className="text-left font-medium py-0.5">Dato</th>
            {TRACKED_CHAINS.map((c) => (
              <th key={c} className="text-right font-medium py-0.5 px-1">
                {c === 'rema-1000' ? 'REMA' : c.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hist.dates
            .slice()
            .reverse()
            .map((date) => (
              <tr key={date} className="border-t border-slate-100">
                <td className="py-0.5 pr-1 text-slate-500">{formatDate(date)}</td>
                {TRACKED_CHAINS.map((c) => {
                  const cell = hist.cells[c][date]
                  if (!cell.present) {
                    return (
                      <td key={c} className="py-0.5 px-1 text-right text-slate-300">
                        —
                      </td>
                    )
                  }
                  return (
                    <td
                      key={c}
                      className={`py-0.5 px-1 text-right font-mono ${
                        cell.isOnSale ? 'text-rose-600 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      {formatKr(cell.priceKr)}
                    </td>
                  )
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
