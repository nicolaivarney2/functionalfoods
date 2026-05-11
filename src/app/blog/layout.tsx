import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blogkategorier | Functional Foods',
  description: 'Oversigt over blogkategorier med guides, artikler og inspiration om kost, vaner og vægttab.',
  alternates: {
    canonical: 'https://functionalfoods.dk/blog',
  },
  openGraph: {
    title: 'Blogkategorier | Functional Foods',
    description: 'Vælg en niche og læs nye, evidensbaserede artikler fra Functional Foods.',
    url: 'https://functionalfoods.dk/blog',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
