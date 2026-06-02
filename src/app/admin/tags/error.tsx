'use client'

import { useEffect } from 'react'

export default function TagsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('🔥 /admin/tags error boundary:', error)
  }, [error])

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="text-base font-semibold text-red-800">Noget gik galt på Tag-siden</h2>
        <p className="mt-1 text-sm text-red-700">
          Den underliggende fejl er nedenfor – send den til udvikleren hvis den dukker op igen.
        </p>
        {error?.message && (
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-white/70 p-3 text-xs text-red-900">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        )}
        {error?.digest && (
          <p className="mt-2 text-xs text-red-600">Digest: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Prøv igen
        </button>
        <a
          href="/admin"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Tilbage til dashboard
        </a>
      </div>
    </div>
  )
}
