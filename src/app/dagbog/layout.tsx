import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Maddagbog | Functional Foods',
  description:
    'Log det du spiser: synk madplan, importer fra link, indtal måltidet eller vælg opskrift — kalorier og makro mod dit personlige mål.',
}

export default function DagbogLayout({ children }: { children: React.ReactNode }) {
  return children
}
