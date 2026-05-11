import Link from 'next/link'
import SuccessStoriesBar from '@/components/SuccessStoriesBar'

const BLOG_CATEGORIES = [
  { slug: 'keto', name: 'Keto', description: 'Guides, artikler og inspiration om keto og vægttab.' },
  { slug: 'sense', name: 'Sense', description: 'Balanceret tilgang til sund mad, vaner og vægttab.' },
  { slug: 'glp-1', name: 'GLP-1 kost', description: 'Artikler om mæthed, vaner og GLP-1-inspireret kost.' },
  { slug: 'anti-inflammatory', name: 'Anti-inflammatorisk', description: 'Madvalg og vaner der kan støtte kroppen.' },
  { slug: 'flexitarian', name: 'Fleksitarisk', description: 'Mere plantebaseret hverdag med fleksibilitet.' },
  { slug: '5-2-diet', name: '5:2 Diæt', description: 'Intermittent fasting og praktisk hverdagsstruktur.' },
  { slug: 'proteinrig-kost', name: 'Proteinrig kost', description: 'Proteinrige valg til mæthed og muskelbevarelse.' },
  { slug: 'familie', name: 'Kalorietælling', description: 'Familievenlig madplan, kalorier og hverdagsbalance.' },
  { slug: 'mentalt', name: 'Mentalt', description: 'Adfærd, vaner og motivation i et langsigtet vægttab.' },
]

export default function BlogOverviewPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="py-10 sm:py-14 border-b border-gray-100">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Blogkategorier</h1>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Vælg den niche du vil dykke ned i. Vi udgiver løbende nye artikler, guides og praktiske råd.
            </p>
          </div>
        </div>
      </section>
      <section className="py-6 border-b border-gray-100">
        <div className="container">
          <SuccessStoriesBar />
        </div>
      </section>

      <section className="py-10 sm:py-12">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BLOG_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/blog/${category.slug}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                  {category.name}
                </h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {category.description}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  Se kategori →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
