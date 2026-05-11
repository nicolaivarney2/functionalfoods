import type { Metadata } from 'next'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ category: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { category } = await params
  const normalized = String(category || '').toLowerCase()
  const canonicalUrl = `https://functionalfoods.dk/blog/${normalized}`
  return {
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,
    },
  }
}

export default function BlogCategoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
