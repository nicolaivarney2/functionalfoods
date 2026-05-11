import type { Metadata } from 'next'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ category: string; slug: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { category, slug } = await params
  const canonicalUrl = `https://functionalfoods.dk/blog/${String(category || '').toLowerCase()}/${String(slug || '')}`
  return {
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,
    },
  }
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return children
}
