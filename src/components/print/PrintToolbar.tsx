'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Printer } from 'lucide-react'

export function PrintToolbar({
  autoprint = false,
  backHref,
  backLabel,
}: {
  autoprint?: boolean
  backHref: string
  backLabel: string
}) {
  useEffect(() => {
    if (!autoprint) return
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [autoprint])

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        <Printer size={18} aria-hidden />
        Print
      </button>
      <Link href={backHref} className="text-sm font-medium text-gray-600 hover:text-gray-900">
        {backLabel}
      </Link>
    </div>
  )
}
