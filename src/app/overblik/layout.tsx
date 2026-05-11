import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dit overblik | Functional Foods',
  description:
    'Styr på Madbudget, dagligvarer, vægt tracker, opskrifter og mere – ét samlet sted efter du er logget ind.',
  alternates: {
    canonical: 'https://functionalfoods.dk/overblik',
  },
}

export default function OverblikLayout({ children }: { children: React.ReactNode }) {
  return children
}
