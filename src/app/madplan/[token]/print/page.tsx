import { Suspense } from 'react'
import { MealPlanPrintPageClient } from './MealPlanPrintPageClient'

export const dynamic = 'force-dynamic'

export default function MealPlanPrintPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-center text-gray-600">Henter madplan…</p>}>
      <MealPlanPrintPageClient />
    </Suspense>
  )
}
