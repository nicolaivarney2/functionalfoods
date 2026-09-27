import type { Metadata } from 'next'
import { PrintLayoutFrame } from '@/components/print/PrintLayoutFrame'

export const metadata: Metadata = {
  title: 'Print opskrift | Functional Foods',
  robots: { index: false, follow: false },
}

export default function RecipePrintLayout({ children }: { children: React.ReactNode }) {
  return <PrintLayoutFrame>{children}</PrintLayoutFrame>
}
