'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import {
  Store,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  ArrowLeft,
  Activity,
} from 'lucide-react'
import Link from 'next/link'

type SyncHealthStore = {
  storeId: string
  label: string
  offerDay: string
  lastSyncAt: string | null
  daysSinceSync: number | null
  daysSinceLastOfferDay: number
  totalOffers: number
  activeOffers: number
  onSaleFlag: number
  expiredButStillFlagged: number
  updatedLast24h: number
  updatedLast7d: number
  status: 'healthy' | 'late' | 'stale' | 'empty'
  statusReason: string
}

type SyncHealthSummary = {
  totalStores: number
  healthy: number
  late: number
  stale: number
  empty: number
  totalOffers: number
  totalActiveOffers: number
  totalExpiredButStillFlagged: number
  generatedAt: string
  durationMs: number
}

function formatLastSync(iso: string | null): string {
  if (!iso) return 'aldrig'
  const date = new Date(iso)
  return date.toLocaleString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDaysSince(days: number | null): string {
  if (days == null) return '–'
  if (days < 1 / 24) return 'lige nu'
  if (days < 1) {
    const hours = Math.round(days * 24)
    return `${hours} time${hours === 1 ? '' : 'r'} siden`
  }
  const rounded = Math.round(days)
  return `${rounded} dag${rounded === 1 ? '' : 'e'} siden`
}

const STATUS_LABELS: Record<SyncHealthStore['status'], string> = {
  healthy: 'OK',
  late: 'Forsinket',
  stale: 'Stale',
  empty: 'Ingen data',
}

const STATUS_COLORS: Record<SyncHealthStore['status'], string> = {
  healthy: 'bg-green-100 text-green-700 border-green-200',
  late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  stale: 'bg-red-100 text-red-700 border-red-200',
  empty: 'bg-gray-100 text-gray-700 border-gray-200',
}

type GomaStoreId =
  | 'Netto'
  | 'REMA 1000'
  | '365discount'
  | 'Lidl'
  | 'Bilka'
  | 'Nemlig'
  | 'MENY'
  | 'Spar'
  | 'Kvickly'
  | 'superbrugsen'
  | 'Brugsen'
  | 'Løvbjerg'
  | 'ABC Lavpris'

const GOMA_STORES: {
  id: GomaStoreId
  label: string
  offerDay: string
  note?: string
}[] = [
  { id: 'Netto', label: 'Netto', offerDay: 'Fredag' },
  { id: 'REMA 1000', label: 'REMA 1000', offerDay: 'Lørdag' },
  { id: '365discount', label: '365 Discount', offerDay: 'Onsdag', note: 'Goma-id: 365discount' },
  { id: 'Lidl', label: 'Lidl', offerDay: 'Lørdag' },
  { id: 'Bilka', label: 'Bilka', offerDay: 'Fredag' },
  { id: 'Nemlig', label: 'Nemlig', offerDay: 'Søndag' },
  { id: 'MENY', label: 'MENY', offerDay: 'Torsdag' },
  { id: 'Spar', label: 'Spar', offerDay: 'Torsdag' },
  { id: 'Kvickly', label: 'Kvickly', offerDay: 'Torsdag' },
  { id: 'superbrugsen', label: 'SuperBrugsen', offerDay: 'Torsdag', note: 'Goma-id: superbrugsen' },
  { id: 'Brugsen', label: 'Brugsen', offerDay: 'Fredag' },
  { id: 'Løvbjerg', label: 'Løvbjerg', offerDay: 'Torsdag' },
  { id: 'ABC Lavpris', label: 'ABC Lavpris', offerDay: 'Tirsdag' }
]

export default function AdminGomaDagligvarerPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [syncingStore, setSyncingStore] = useState<GomaStoreId | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null)
  const [cleaningUp, setCleaningUp] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [healthSummary, setHealthSummary] = useState<SyncHealthSummary | null>(null)
  const [healthStores, setHealthStores] = useState<SyncHealthStore[]>([])

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      const res = await fetch('/api/admin/dagligvarer/sync-health', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Kunne ikke hente sync-status')
      }
      setHealthSummary(data.summary as SyncHealthSummary)
      setHealthStores((data.stores as SyncHealthStore[]) || [])
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Ukendt fejl ved hentning af sync-status')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchHealth()
    }
  }, [isAdmin, fetchHealth])

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

  if (!isAdmin) {
    return null
  }

  const handleSyncStore = async (storeId: GomaStoreId) => {
    setSyncingStore(storeId)
    setStatusMessage(null)
    setStatusType(null)

    try {
      const res = await fetch('/api/admin/goma/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stores: [storeId],
          limit: 150,
          // 250 * 150 = 37.500 produkter pr. butik – nok til selv Nemlig (~30k).
          // Selve import-funktionen stopper når en side er tom, så det her er
          // bare loftet, ikke det faktiske antal kald.
          pages: 250
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Ukendt fejl ved Goma sync')
      }

      const imported = typeof data.imported === 'number' ? data.imported : undefined
      const cleanedExpired =
        data.cleanup && typeof data.cleanup.cleaned === 'number'
          ? (data.cleanup.cleaned as number)
          : null
      const parts: string[] = []
      parts.push(
        imported != null
          ? `Synkronisering for ${storeId} gennemført. Importerede ca. ${imported} produkter.`
          : `Synkronisering for ${storeId} gennemført.`
      )
      if (cleanedExpired != null) {
        parts.push(
          cleanedExpired === 0
            ? 'Ingen udløbne tilbud at rydde op i.'
            : `Ryddet op i ${cleanedExpired} udløbne tilbud på tværs af alle butikker.`
        )
      }
      setStatusMessage(parts.join(' '))
      setStatusType('success')
      fetchHealth()
    } catch (error) {
      console.error('GOMA sync fejl:', error)
      setStatusMessage(
        `Kunne ikke synce ${storeId}: ${
          error instanceof Error ? error.message : 'Ukendt fejl'
        }`
      )
      setStatusType('error')
    } finally {
      setSyncingStore(null)
    }
  }

  const handleCleanupExpired = async () => {
    setCleaningUp(true)
    setStatusMessage(null)
    setStatusType(null)

    try {
      const res = await fetch('/api/admin/dagligvarer/cleanup-expired-offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Ukendt fejl ved cleanup')
      }

      setStatusMessage(
        `Ryddet op i ${data.cleaned || 0} udløbne tilbud. ${data.byStore ? Object.entries(data.byStore).map(([store, count]) => `${store}: ${count}`).join(', ') : ''}`
      )
      setStatusType('success')
      fetchHealth()
    } catch (error) {
      console.error('Cleanup fejl:', error)
      setStatusMessage(
        `Kunne ikke rydde op: ${
          error instanceof Error ? error.message : 'Ukendt fejl'
        }`
      )
      setStatusType('error')
    } finally {
      setCleaningUp(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dagligvarer"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Tilbage til dagligvarer admin
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Store className="h-6 w-6 text-indigo-600" />
                GOMA dagligvarer sync
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Her kan du manuelt synce produkter fra GOMAs API for hver butik. Disse data
                bruges på dagligvarer-siden via vores fælles produktstruktur.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 border border-blue-100">
              <CalendarDays className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-xs text-blue-800">
                Automatisk sync kører via GitHub Actions kl. 04:00 og 16:00 dansk tid.
                Begge kørsler synker butikker med nye tilbud den pågældende dag og rydder
                op i udløbne tilbud bagefter.
              </p>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`mb-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                statusType === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-100'
                  : 'bg-red-50 text-red-800 border border-red-100'
              }`}
            >
              {statusType === 'success' ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5" />
              )}
              <p>{statusMessage}</p>
            </div>
          )}

          {/* Sync health overview */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-gray-900">Sync-status pr. butik</h2>
                {healthSummary && (
                  <span className="text-xs text-gray-500">
                    ({healthSummary.totalActiveOffers.toLocaleString('da-DK')} aktive tilbud i alt)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={fetchHealth}
                disabled={healthLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${healthLoading ? 'animate-spin' : ''}`} />
                {healthLoading ? 'Henter…' : 'Opdater'}
              </button>
            </div>

            {healthError && (
              <div className="mx-4 my-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {healthError}
              </div>
            )}

            {healthSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">OK</p>
                  <p className="text-lg font-semibold text-green-700">{healthSummary.healthy}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Forsinket</p>
                  <p className="text-lg font-semibold text-yellow-700">{healthSummary.late}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Stale</p>
                  <p className="text-lg font-semibold text-red-700">{healthSummary.stale}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Udløbne flagget</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {healthSummary.totalExpiredButStillFlagged}
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Butik</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Sidst synket</th>
                    <th className="px-3 py-2 text-right font-medium">Tilbud</th>
                    <th className="px-3 py-2 text-right font-medium">Aktive</th>
                    <th className="px-3 py-2 text-right font-medium">Udløbne flagget</th>
                  </tr>
                </thead>
                <tbody>
                  {healthStores.length === 0 && !healthLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        Ingen sync-data endnu.
                      </td>
                    </tr>
                  )}
                  {healthStores.map((store) => (
                    <tr key={store.storeId} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span>{store.label}</span>
                          <span className="text-[10px] text-gray-500">
                            Nye tilbud: {store.offerDay}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[store.status]}`}
                          title={store.statusReason}
                        >
                          {STATUS_LABELS[store.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <div className="flex flex-col">
                          <span>{formatLastSync(store.lastSyncAt)}</span>
                          <span className="text-[10px] text-gray-500">
                            {formatDaysSince(store.daysSinceSync)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {store.totalOffers.toLocaleString('da-DK')}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {store.activeOffers.toLocaleString('da-DK')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={
                            store.expiredButStillFlagged > 0
                              ? 'text-red-700 font-semibold'
                              : 'text-gray-700'
                          }
                        >
                          {store.expiredButStillFlagged.toLocaleString('da-DK')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOMA_STORES.map((store) => (
              <div
                key={store.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col justify-between bg-gray-50/60"
              >
                <div className="mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-gray-500" />
                      {store.label}
                    </h2>
                    <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      <CalendarDays className="h-3 w-3" />
                      <span>Nye tilbud: {store.offerDay}</span>
                    </div>
                  </div>
                  {store.note && (
                    <p className="mt-1 text-xs text-gray-500">
                      {store.note}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-600">
                    Synker både produkter og tilbud for denne butik fra Goma. Henter
                    op til ~37.500 produkter pr. butik (nok til selv Nemlig), parallelt
                    i batches af 6 sider. Stopper automatisk når kataloget er tomt.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSyncStore(store.id)}
                  disabled={!!syncingStore}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {syncingStore === store.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Synker {store.label}…</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Sync {store.label} nu</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vedligeholdelse</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 mb-3">
                <strong>Ryd op i udløbne tilbud:</strong> Finder og deaktiverer alle tilbud hvor 
                <code className="bg-yellow-100 px-1 rounded">sale_valid_to</code> er i fortiden, 
                men stadig er markeret som aktive. Dette sikrer at udløbne tilbud ikke vises på siden.
              </p>
              <button
                type="button"
                onClick={handleCleanupExpired}
                disabled={cleaningUp || !!syncingStore}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cleaningUp ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Rydder op...</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>Ryd op i udløbne tilbud</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p className="mb-1">
              Bemærk: Vi behøver ikke at hente hele kataloget hver dag. Vi fokuserer på
              aktuelle tilbud og vigtigste produkter for at holde svartiden under Vercels
              10 sekunders grænse.
            </p>
            <p>
              Hvis du vil lave en fuld re-import af alle produkter fra Goma, kan det gøres
              via scripts eller ved at justere limit/pages manuelt i backend – spørg
              udvikleren først.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


