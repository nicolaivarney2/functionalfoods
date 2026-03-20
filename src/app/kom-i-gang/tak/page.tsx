import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Tak for din støtte | Functional Foods',
  description: 'Din betaling er registreret. Dit overblik venter.',
}

/** Gamle bogmærker / links: samme destination som Stripe success. */
export default function KomIGangTakPage() {
  redirect('/overblik?betaling=ok')
}
