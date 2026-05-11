import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Tak for din støtte | Functional Foods',
  description: 'Din betaling er registreret. Dit overblik venter.',
  alternates: {
    canonical: 'https://functionalfoods.dk/kom-i-gang/tak',
  },
}

/** Gamle bogmærker / links: samme destination som Stripe success. */
export default function KomIGangTakPage() {
  redirect('/overblik?betaling=ok')
}
