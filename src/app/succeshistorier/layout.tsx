import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Succeshistorier | Functional Foods',
  description:
    'Se selvindberettede vægttabsresultater, før/efter billeder og tips fra brugere på tværs af kostnicher.',
  alternates: {
    canonical: 'https://functionalfoods.dk/succeshistorier',
  },
  openGraph: {
    title: 'Succeshistorier | Functional Foods',
    description:
      'Inspiration fra brugere: kostmetode, motion, før/efter og praktiske råd til vægttab.',
    url: 'https://functionalfoods.dk/succeshistorier',
  },
}

export default function SuccessStoriesLayout({ children }: { children: React.ReactNode }) {
  return children
}
