import Link from 'next/link'

export default function SuccessStoriesBar() {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-emerald-900">
          <span className="font-semibold">Succeshistorier:</span> Se før/efter resultater, kostniche og tips fra andre.
        </p>
        <Link
          href="/succeshistorier"
          className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          Se succeshistorier
        </Link>
      </div>
    </div>
  )
}
