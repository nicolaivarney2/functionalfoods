/**
 * Tjek (Squid) sync — live preview / explorer.
 *
 * Internal verification tool. Hits squid-api.tjek.com live on each page load
 * (dry-run, no DB writes) and renders exactly what the next real sync would
 * upsert into the grocery DB. Use this to sanity-check chains before flipping
 * the cron on, and to see how rich the data is per chain.
 *
 * NOT indexable. Not in sitemap. /dev/* routes are internal-only.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  syncTjek,
  TJEK_DEALER_TO_CHAIN,
  CHAINS_WITH_PRIMARY_CATALOG,
  type TjekSyncPreviewItem,
  type TjekSyncResult,
} from '@/grocery/adapters/tjek'
import {
  CHAIN_COVERAGE,
  COVERAGE_LABEL,
  type CatalogCoverage,
  type SourceChain,
} from '@/grocery/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Tjek explorer (internal)',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

const DEFAULT_CHAIN: SourceChain = 'lidl'
const PREVIEW_PER_CHAIN = 60

const CHAIN_LABEL: Partial<Record<SourceChain, string>> = {
  'rema-1000': 'REMA 1000',
  '365discount': '365discount',
  'abc-lavpris': 'ABC Lavpris',
  'min-koebmand': 'Min Købmand',
  loevbjerg: 'Løvbjerg',
  superbrugsen: 'SuperBrugsen',
  kvickly: 'Kvickly',
  brugsen: 'Brugsen',
  meny: 'MENY',
  spar: 'SPAR',
  lidl: 'Lidl',
  nemlig: 'Nemlig',
  netto: 'Netto',
  bilka: 'Bilka',
  foetex: 'føtex',
}

function chainLabel(c: SourceChain): string {
  return CHAIN_LABEL[c] ?? c
}

function formatKr(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toFixed(2).replace('.', ',')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('da-DK', {
    day: '2-digit',
    month: 'short',
  })
}

function daysLeft(iso: string): number {
  const ms = Date.parse(iso) - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}

const ALL_CHAINS = Object.values(TJEK_DEALER_TO_CHAIN) as SourceChain[]
const NON_PRIMARY_CHAINS = ALL_CHAINS.filter((c) => !CHAINS_WITH_PRIMARY_CATALOG.has(c))

interface PageProps {
  searchParams: Promise<{ chain?: string; all?: string }>
}

export default async function TjekExplorerPage({ searchParams }: PageProps) {
  if (process.env.GROCERY_SUPABASE_URL == null) notFound()

  const params = await searchParams
  const showAll = params.all === '1'
  const selectedChain = (params.chain as SourceChain | undefined) ?? DEFAULT_CHAIN

  const chainsToFetch = showAll
    ? NON_PRIMARY_CHAINS
    : ([selectedChain] as SourceChain[])

  // Live dry-run against Tjek. No DB writes happen here.
  const t0 = Date.now()
  let result: TjekSyncResult
  try {
    result = await syncTjek({
      dryRun: true,
      collectPreview: true,
      chains: chainsToFetch,
      maxOffersPerDealer: showAll ? PREVIEW_PER_CHAIN : undefined,
      minSleepMs: 100,
      maxSleepMs: 350,
    })
  } catch (err) {
    return <ErrorView message={err instanceof Error ? err.message : String(err)} />
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  const byChain = groupByChain(result.preview ?? [])
  const chainOrder = showAll
    ? NON_PRIMARY_CHAINS.filter((c) => byChain.has(c))
    : Array.from(byChain.keys())

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-baseline justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tjek (squid-api) explorer</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Live dry-run mod{' '}
              <code className="rounded bg-slate-200/60 px-1 font-mono text-[11px]">
                squid-api.tjek.com
              </code>{' '}
              · Ingen DB-writes · {result.dealersProcessed} dealers,{' '}
              {result.offersProcessed.toLocaleString('da-DK')} offers på {elapsed}s
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              result.status === 'success'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : result.status === 'paused' || result.status === 'disabled'
                  ? 'bg-amber-50 text-amber-800 ring-amber-200'
                  : 'bg-rose-50 text-rose-700 ring-rose-200'
            }`}
          >
            {result.status}
          </span>
        </header>

        <ChainPicker selected={selectedChain} showAll={showAll} />

        <CoverageLegend />

        {result.errorMessage && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <strong className="font-semibold">Fejl:</strong> {result.errorMessage}
          </div>
        )}

        <section className="mt-6 space-y-6">
          {chainOrder.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Ingen offers fundet for det valgte filter.
            </div>
          ) : (
            chainOrder.map((chain) => (
              <ChainSection
                key={chain}
                chain={chain}
                offers={byChain.get(chain) ?? []}
                limit={showAll ? 12 : 50}
              />
            ))
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-3 text-xs text-slate-400">
          Genereret {new Date().toLocaleString('da-DK')} · Hver page-load = ét live API-kald.
          Kør{' '}
          <code className="rounded bg-slate-200/60 px-1 font-mono">
            GROCERY_TJEK_DISABLED=true
          </code>{' '}
          for at slå al Tjek-trafik fra øjeblikkeligt.
        </footer>
      </div>
    </div>
  )
}

function groupByChain(items: TjekSyncPreviewItem[]): Map<SourceChain, TjekSyncPreviewItem[]> {
  const map = new Map<SourceChain, TjekSyncPreviewItem[]>()
  for (const item of items) {
    const bucket = map.get(item.chain)
    if (bucket) bucket.push(item)
    else map.set(item.chain, [item])
  }
  return map
}

function ChainPicker({
  selected,
  showAll,
}: {
  selected: SourceChain
  showAll: boolean
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
      <a
        href="?all=1"
        className={`rounded px-2.5 py-1 text-xs font-medium ${
          showAll
            ? 'bg-slate-900 text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        Alle (sample)
      </a>
      {NON_PRIMARY_CHAINS.map((c) => (
        <a
          key={c}
          href={`?chain=${c}`}
          className={`rounded px-2.5 py-1 text-xs font-medium ${
            !showAll && c === selected
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {chainLabel(c)}
        </a>
      ))}
    </nav>
  )
}

function ChainSection({
  chain,
  offers,
  limit,
}: {
  chain: SourceChain
  offers: TjekSyncPreviewItem[]
  limit: number
}) {
  const shown = offers.slice(0, limit)
  const hasMore = offers.length > limit
  const avgDiscount =
    offers.filter((o) => o.discountPct != null).length > 0
      ? Math.round(
          offers
            .filter((o) => o.discountPct != null)
            .reduce((s, o) => s + (o.discountPct ?? 0), 0) /
            offers.filter((o) => o.discountPct != null).length,
        )
      : null

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-baseline justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-slate-900">{chainLabel(chain)}</h2>
          <CoverageBadge coverage={CHAIN_COVERAGE[chain]} />
        </div>
        <div className="text-xs text-slate-500">
          {offers.length} offers
          {avgDiscount != null && (
            <span className="ml-3 text-rose-600">⌀ -{avgDiscount}%</span>
          )}
        </div>
      </div>
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-auto" />
          <col className="w-24" />
          <col className="w-20" />
          <col className="w-20" />
          <col className="w-16" />
          <col className="w-24" />
        </colgroup>
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-1.5 text-left font-medium">Produkt</th>
            <th className="px-3 py-1.5 text-right font-medium">Mængde</th>
            <th className="px-3 py-1.5 text-right font-medium">Pris</th>
            <th className="px-3 py-1.5 text-right font-medium">Før</th>
            <th className="px-3 py-1.5 text-right font-medium">%</th>
            <th className="px-3 py-1.5 text-right font-medium">Gælder</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((o) => (
            <tr key={o.offerId} className="border-t border-slate-100 align-top">
              <td className="px-3 py-1.5">
                <div className="truncate text-slate-900" title={o.heading}>
                  {o.heading}
                </div>
                {o.description && (
                  <div
                    className="truncate text-[11px] text-slate-500"
                    title={o.description}
                  >
                    {o.description}
                  </div>
                )}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-[12px] text-slate-600">
                {o.amount != null ? `${o.amount} ${o.unit ?? ''}` : '—'}
              </td>
              <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-900">
                {formatKr(o.priceKr)}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-[12px] text-slate-400 line-through">
                {o.preKr ? formatKr(o.preKr) : '—'}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-[12px] text-rose-600">
                {o.discountPct != null ? `-${o.discountPct}%` : '—'}
              </td>
              <td className="px-3 py-1.5 text-right text-[11px] text-slate-500">
                <div>{formatDate(o.runTill)}</div>
                <div className="text-[10px] text-slate-400">
                  {daysLeft(o.runTill)}d tilbage
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
          + {offers.length - limit} flere offers — vist {limit} af {offers.length}
        </div>
      )}
    </div>
  )
}

const COVERAGE_BADGE_STYLE: Record<CatalogCoverage, string> = {
  full: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'offers-only': 'bg-amber-50 text-amber-800 ring-amber-200',
  none: 'bg-slate-100 text-slate-500 ring-slate-200',
}

function CoverageBadge({ coverage }: { coverage: CatalogCoverage }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ${COVERAGE_BADGE_STYLE[coverage]}`}
    >
      {COVERAGE_LABEL[coverage]}
    </span>
  )
}

function CoverageLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
      <span className="font-medium text-slate-700">Kæde-dækning:</span>
      <span className="inline-flex items-center gap-1.5">
        <CoverageBadge coverage="full" />
        <span>Salling / REMA — fuld produktliste + tilbud</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CoverageBadge coverage="offers-only" />
        <span>Tjek — kun ugens tilbudsavis, ingen normalpriser</span>
      </span>
    </div>
  )
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-slate-900">Tjek explorer — fejl</h1>
        <p className="mt-2 text-sm text-slate-600">
          Live-fetch fejlede. Det her er typisk forventet hvis Tjek midlertidigt
          blokerer os, eller hvis kill-switchen er aktiv.
        </p>
        <pre className="mt-4 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          {message}
        </pre>
      </div>
    </div>
  )
}
