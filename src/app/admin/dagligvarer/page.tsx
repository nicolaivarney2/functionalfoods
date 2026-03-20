'use client'

import Link from 'next/link'
import { Store, RefreshCw } from 'lucide-react'

export default function AdminDagligvarerPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Store className="h-6 w-6" />
              Dagligvare Admin
            </h1>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Vi har ryddet op i de gamle REMA/Netto‑scrapers. Al dagligvaredata kommer nu fra GOMA,
            og al manuel synkronisering sker via GOMA‑sync.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <Link
              href="/admin/dagligvarer/goma"
              className="block border border-indigo-200 rounded-lg p-5 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-indigo-700" />
                  <span className="text-base font-semibold text-indigo-900">GOMA sync</span>
                </div>
                <RefreshCw className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-sm text-indigo-900">
                Gå til GOMA‑dashboardet hvor du kan synce alle butikker (Netto, REMA 1000, Bilka,
                Lidl, osv.) og rydde op i udløbne tilbud. Dette er den eneste dagligvare‑sync vi
                bruger nu.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}