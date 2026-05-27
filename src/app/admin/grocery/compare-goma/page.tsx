'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react'

type Coverage = 'full' | 'offers-only' | 'none'

interface CompareRow {
  chain: string
  coverage: Coverage
  goma_total: number
  goma_on_sale: number
  grocery_total: number
  grocery_on_sale: number
  delta_total: number
  delta_on_sale: number
}

interface CompareResponse {
  generated_at: string
  duration_ms: number
  rows: CompareRow[]
  totals: {
    goma_total: number
    goma_on_sale: number
    grocery_total: number
    grocery_on_sale: number
  }
  goma_grand_total: number
  goma_grand_on_sale: number
  grocery_grand_total: number
  grocery_grand_on_sale: number
}

const CHAIN_LABEL: Record<string, string> = {
  netto: 'Netto',
  foetex: 'Føtex',
  bilka: 'Bilka',
  'rema-1000': 'REMA 1000',
  nemlig: 'Nemlig',
  lidl: 'Lidl',
  '365discount': '365discount',
  kvickly: 'Kvickly',
  superbrugsen: 'SuperBrugsen',
  brugsen: 'Brugsen',
  meny: 'MENY',
  spar: 'SPAR',
  loevbjerg: 'Løvbjerg',
  'abc-lavpris': 'ABC Lavpris',
  'min-koebmand': 'Min Købmand',
}

const COVERAGE_BADGE: Record<Coverage, { label: string; cls: string }> = {
  full: { label: 'Fuldt katalog', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'offers-only': { label: 'Kun tilbud', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  none: { label: 'Ingen data', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function fmt(n: number): string {
  return n.toLocaleString('da-DK')
}

function DeltaCell({ value, label }: { value: number; label?: 'higher-is-better' }) {
  if (value === 0) return <span className="text-slate-400">—</span>
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-emerald-700">
        <TrendingUp size={12} />+{fmt(value)}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono ${
        label === 'higher-is-better' ? 'text-rose-700' : 'text-slate-500'
      }`}
    >
      <TrendingDown size={12} />
      {fmt(value)}
    </span>
  )
}

function VerdictBadge({ row }: { row: CompareRow }) {
  if (row.coverage === 'none') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        <AlertCircle size={11} /> Ingen adapter
      </span>
    )
  }
  if (row.delta_on_sale >= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 size={11} /> Klar
      </span>
    )
  }
  if (row.delta_on_sale > -50) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <AlertCircle size={11} /> Lille gap
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
      <XCircle size={11} /> Stort gap
    </span>
  )
}

export default function CompareGomaPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [data, setData] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/grocery/compare-goma', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kunne ikke hente sammenligning')
      setData(json as CompareResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchData()
  }, [isAdmin, fetchData])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Tjekker admin rettigheder...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  const sortedRows = data?.rows ? [...data.rows].sort((a, b) => b.goma_on_sale - a.goma_on_sale) : []

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/admin/dagligvarer"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft size={14} />
            Tilbage til dagligvare-admin
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Goma vs grocery-service</h1>
              <p className="text-sm text-gray-600 mt-1">
                Live sammenligning af aktive tilbud pr. kæde. Bruges til at verificere at vores
                nye grocery-service kan erstatte Goma før vi migrerer <code>/dagligvarer</code>.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Genindlæs
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <strong className="font-semibold">Fejl:</strong> {error}
          </div>
        )}

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Goma — aktive tilbud"
              value={data.goma_grand_on_sale}
              sub={`af ${fmt(data.goma_grand_total)} total`}
              tone="neutral"
            />
            <SummaryCard
              label="Grocery — aktive tilbud"
              value={data.grocery_grand_on_sale}
              sub={`af ${fmt(data.grocery_grand_total)} total`}
              tone={data.grocery_grand_on_sale >= data.goma_grand_on_sale ? 'good' : 'warn'}
            />
            <SummaryCard
              label="Δ aktive tilbud"
              value={data.grocery_grand_on_sale - data.goma_grand_on_sale}
              sub={
                data.goma_grand_on_sale > 0
                  ? `${Math.round((data.grocery_grand_on_sale / data.goma_grand_on_sale) * 100)}% af Goma`
                  : ''
              }
              tone={
                data.grocery_grand_on_sale - data.goma_grand_on_sale >= 0 ? 'good' : 'warn'
              }
              showSign
            />
            <SummaryCard
              label="Sidst opdateret"
              value={data.duration_ms / 1000}
              format={(n) => `${n.toFixed(1)}s`}
              sub={new Date(data.generated_at).toLocaleString('da-DK')}
              tone="neutral"
            />
          </div>
        )}

        {/* Per-chain table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Pr. kæde — sorteret efter Gomas tilbudsantal</h2>
          </div>
          {loading && !data ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Henter sammenligning…</div>
          ) : sortedRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Ingen data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Kæde</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Goma total</th>
                    <th className="px-4 py-2 text-right font-medium">Goma tilbud</th>
                    <th className="px-4 py-2 text-right font-medium">Grocery total</th>
                    <th className="px-4 py-2 text-right font-medium">Grocery tilbud</th>
                    <th className="px-4 py-2 text-right font-medium">Δ total</th>
                    <th className="px-4 py-2 text-right font-medium">Δ tilbud</th>
                    <th className="px-4 py-2 text-left font-medium">Vurdering</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.chain} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {CHAIN_LABEL[row.chain] ?? row.chain}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${COVERAGE_BADGE[row.coverage].cls}`}
                        >
                          {COVERAGE_BADGE[row.coverage].label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-700">{fmt(row.goma_total)}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-700">{fmt(row.goma_on_sale)}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-700">{fmt(row.grocery_total)}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-900 font-semibold">
                        {fmt(row.grocery_on_sale)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <DeltaCell value={row.delta_total} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <DeltaCell value={row.delta_on_sale} label="higher-is-better" />
                      </td>
                      <td className="px-4 py-2">
                        <VerdictBadge row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr className="border-t-2 border-gray-200">
                    <td className="px-4 py-2 text-gray-900" colSpan={2}>
                      Sum (15 kæder)
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(data?.totals.goma_total ?? 0)}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(data?.totals.goma_on_sale ?? 0)}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(data?.totals.grocery_total ?? 0)}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(data?.totals.grocery_on_sale ?? 0)}</td>
                    <td className="px-4 py-2 text-right">
                      <DeltaCell value={(data?.totals.grocery_total ?? 0) - (data?.totals.goma_total ?? 0)} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <DeltaCell
                        value={(data?.totals.grocery_on_sale ?? 0) - (data?.totals.goma_on_sale ?? 0)}
                        label="higher-is-better"
                      />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Vurdering:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            <li><span className="text-emerald-700 font-medium">Klar</span> — grocery matcher eller overgår Goma på aktive tilbud.</li>
            <li><span className="text-amber-700 font-medium">Lille gap</span> — vi mangler &lt;50 tilbud. Acceptabelt før migration.</li>
            <li><span className="text-rose-700 font-medium">Stort gap</span> — &gt;50 tilbud bag Goma. Undersøg før migration.</li>
            <li><span className="text-slate-600 font-medium">Ingen adapter</span> — kæden er ikke implementeret endnu (fx Nemlig).</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
  showSign,
  format,
}: {
  label: string
  value: number
  sub?: string
  tone: 'good' | 'warn' | 'neutral'
  showSign?: boolean
  format?: (n: number) => string
}) {
  const toneCls =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'warn'
        ? 'border-rose-200 bg-rose-50'
        : 'border-slate-200 bg-white'
  const valueColor =
    tone === 'good' ? 'text-emerald-800' : tone === 'warn' ? 'text-rose-800' : 'text-slate-900'

  const display = format
    ? format(value)
    : showSign && value > 0
      ? `+${fmt(value)}`
      : fmt(value)

  return (
    <div className={`rounded-lg border p-4 ${toneCls}`}>
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueColor}`}>{display}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  )
}
