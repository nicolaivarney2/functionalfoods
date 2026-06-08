'use client'

import Link from 'next/link'
import { Store, BarChart3 } from 'lucide-react'

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
            FF scraper katalog og tilbud til <strong>fooddata</strong> (grocery Supabase).
            Goma er <strong>sunset</strong> — eksisterende Goma-data på production bevares read-only
            indtil cutover til fooddata.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <Link
              href="/admin/dagligvarer/goma"
              className="block border border-gray-200 rounded-lg p-5 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-gray-600" />
                  <span className="text-base font-semibold text-gray-800">GOMA (sunset)</span>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                Read-only oversigt over sidste Goma-sync-status. Ingen nye imports eller cleanup —
                data fryses indtil production skifter til fooddata.
              </p>
            </Link>

            <Link
              href="/admin/grocery/compare-goma"
              className="block border border-emerald-200 rounded-lg p-5 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-700" />
                  <span className="text-base font-semibold text-emerald-900">
                    Goma vs grocery-service
                  </span>
                </div>
              </div>
              <p className="text-sm text-emerald-900">
                Live sammenligning af aktive tilbud pr. kæde. Brug denne side i dagene op til Goma
                sunset for at verificere at vores nye grocery-service matcher eller overgår Gomas
                dækning.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}