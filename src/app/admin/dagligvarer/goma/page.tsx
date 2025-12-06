'use client'

import { useState } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Store, RefreshCw, CheckCircle2, AlertCircle, CalendarDays, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
          // Hent så mange sider som muligt – selve import-funktionen stopper,
          // når en side er tom, så vi ender reelt med "alle produkter" for butikken.
          pages: 40
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Ukendt fejl ved Goma sync')
      }

      const imported = typeof data.imported === 'number' ? data.imported : undefined
      setStatusMessage(
        imported != null
          ? `Synkronisering for ${storeId} gennemført. Importerede ca. ${imported} produkter.`
          : `Synkronisering for ${storeId} gennemført.`
      )
      setStatusType('success')
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
                Der kører også en automatisk daglig sync via GitHub Actions kl. 23.50, som
                synker de butikker der får nye tilbud den pågældende dag.
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
                    Synker både produkter og tilbud for denne butik fra Goma. Der hentes
                    alle sider (op til ca. 6000 produkter pr. butik), så hele kataloget bliver
                    opdateret ved hvert manuelt sync.
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


