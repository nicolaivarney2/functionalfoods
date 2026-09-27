import type { Metadata } from 'next'
import { PrintLayoutFrame } from '@/components/print/PrintLayoutFrame'

export const metadata: Metadata = {
  title: 'Print madplan | Functional Foods',
  robots: { index: false, follow: false },
}

export default function MealPlanPrintLayout({ children }: { children: React.ReactNode }) {
  return <PrintLayoutFrame>{children}</PrintLayoutFrame>
}
