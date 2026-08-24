'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, BarChart3, RefreshCw, Store } from 'lucide-react'
import { useAdminAuth } from '@/hooks/useAdminAuth'

type HealthLevel = 'ok' | 'warn' | 'fail'

type LaunchHealthChain = {
  chain: string
  label: string
  rpcCount: number
  sample: string[]
  daysSinceSeen: number | null
  level: HealthLevel
  reason: string
}

type LaunchHealthReport = {
  generatedAt: string
  ok: boolean
  failCount: number
  warnCount: number
  chains: LaunchHealthChain[]
}

const LEVEL_LABEL: Record<HealthLevel, string> = {
  ok: 'OK',
  warn: 'Advarsel',
  fail: 'Fejl',
}

const LEVEL_CLASS: Record<HealthLevel, string> = {
  ok: 'bg-green-100 text-green-800 border-green-200',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  fail: 'bg-red-100 text-red-800 border-red-200',
}

export default function AdminDagligvarerPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [report, setReport] = useState<LaunchHealthReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/dagligvarer/launch-health', { cache: 'no-store' })
      const data = await res.json()
      if (!data.success && !data.chains) {
        throw new Error(data.error || 'Kunne ikke hente status')
      }
      setReport(data as LaunchHealthReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void fetchHealth()
  }, [isAdmin, fetchHealth])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Tjekker adminrettigheder…</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Store className="h-6 w-6" />
              Dagligvarer — launch-status
            </h1>
            <button
              type="button"
              onClick={() => void fetchHealth()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Opdater
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Tjekker det brugerne ser på /dagligvarer, plus Algolia vs fooddata for Netto/Føtex/Bilka.
            Du får en rapport på mail hver morgen (~08:30 DK). Rød status udløser også mail med det samme
            hvis natte-syncen fejler.
          </p>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          {report && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Status</p>
                <p className={`text-lg font-semibold ${report.ok ? 'text-green-700' : 'text-red-700'}`}>
                  {report.ok ? 'Stabil' : `${report.failCount} kæder fejler`}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Advarsler</p>
                <p className="text-lg font-semibold text-yellow-700">{report.warnCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Kæder</p>
                <p className="text-lg font-semibold text-gray-900">{report.chains.length}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Kæde</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Tilbud</th>
                  <th className="px-3 py-2 text-right font-medium">Alder</th>
                  <th className="px-3 py-2 text-left font-medium">Årsag / sample</th>
                </tr>
              </thead>
              <tbody>
                {(report?.chains ?? []).map((c) => (
                  <tr key={c.chain} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">{c.label}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_CLASS[c.level]}`}
                      >
                        {LEVEL_LABEL[c.level]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.rpcCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      {c.daysSinceSeen == null ? '–' : `${c.daysSinceSeen}d`}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      <div>{c.reason}</div>
                      {c.sample.length > 0 && (
                        <div className="text-xs text-gray-400 truncate max-w-md">
                          {c.sample.join(' · ')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/dev/grocery-verify"
            className="block border border-indigo-200 rounded-lg p-5 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-indigo-700" />
              <span className="font-semibold text-indigo-900">14-dages sync (Netto/Føtex/Bilka/REMA)</span>
            </div>
            <p className="text-sm text-indigo-800">
              Canary-priser og Algolia-dækning — det daglige tjek af native scrapes.
            </p>
          </Link>

          <Link
            href="/admin/dagligvarer/goma"
            className="block border border-gray-200 rounded-lg p-5 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Store className="h-5 w-5 text-gray-600" />
              <span className="font-semibold text-gray-800">Goma sync-tal</span>
            </div>
            <p className="text-sm text-gray-600">Rå tilbudstællere og sidste sync pr. kæde.</p>
          </Link>

          <Link
            href="/admin/grocery/compare-goma"
            className="block border border-emerald-200 rounded-lg p-5 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-emerald-700" />
              <span className="font-semibold text-emerald-900">Goma vs grocery-service</span>
            </div>
            <p className="text-sm text-emerald-900">Live sammenligning af aktive tilbud pr. kæde.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
