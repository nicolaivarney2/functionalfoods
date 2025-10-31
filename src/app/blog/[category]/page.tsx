'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'

interface HubPost {
  id: number
  title: string
  slug: string
  excerpt?: string
  published_at?: string
  post_type?: 'core' | 'blog'
  view_count?: number
  header_image_url?: string
  category?: { slug: string; name: string } | null
}

interface HubRecipe {
  id: string
  title: string
  slug: string
  imageUrl?: string
  image_url?: string
  shortDescription?: string
  totalTime?: number
  servings?: number
  difficulty?: string
  dietaryCategories?: string[]
  mainCategory?: string
  rating?: number
}

export default function BlogCategoryHubPage() {
  const params = useParams() as any
  const categorySlug = params?.category as string
  const supabase = createSupabaseClient()

  const [firstArticle, setFirstArticle] = useState<HubPost | null>(null)
  const [latestArticles, setLatestArticles] = useState<HubPost[]>([])
  const [mustReads, setMustReads] = useState<HubPost[]>([])
  const [popularArticles, setPopularArticles] = useState<HubPost[]>([])
  const [recipes, setRecipes] = useState<HubRecipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // First article (latest published for category)
        const { data: latestData } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,published_at,view_count,header_image_url,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(1)

        const first = (latestData || []).filter((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return cat?.slug === categorySlug
        }).map((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return { ...p, category: cat }
        })[0]
        setFirstArticle(first || null)

        // Latest 3-4 articles (excluding first)
        const { data: latestPosts } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,published_at,view_count,header_image_url,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(10)

        const latestFiltered = (latestPosts || [])
          .filter((p: any) => {
            const cat = Array.isArray(p.category) ? p.category[0] : p.category
            return cat?.slug === categorySlug && p.id !== first?.id
          })
          .map((p: any) => {
            const cat = Array.isArray(p.category) ? p.category[0] : p.category
            return { ...p, category: cat }
          })
          .slice(0, 4)
        setLatestArticles(latestFiltered)

        // Must Reads (core articles)
        const { data: corePosts } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,view_count,header_image_url,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .eq('post_type', 'core')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(6)

        const mustReadsFiltered = (corePosts || []).filter((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return cat?.slug === categorySlug
        }).map((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return { ...p, category: cat }
        })
        setMustReads(mustReadsFiltered)

        // Popular Articles (by view_count)
        const { data: popularPosts } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,view_count,published_at,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .order('view_count', { ascending: false, nullsFirst: false })
          .limit(10)

        const popularFiltered = (popularPosts || [])
          .filter((p: any) => {
            const cat = Array.isArray(p.category) ? p.category[0] : p.category
            return cat?.slug === categorySlug
          })
          .map((p: any) => {
            const cat = Array.isArray(p.category) ? p.category[0] : p.category
            return { ...p, category: cat }
          })
          .slice(0, 5)
        setPopularArticles(popularFiltered)

        // Recipes matching dietary category
        const { data: recipesData } = await supabase
          .from('recipes')
          .select('*')
          .order('updatedAt', { ascending: false })
          .limit(50)

        const diet = (categorySlug || '').toLowerCase()
        let filtered = (recipesData || [])
        
        // Try multiple matching strategies
        if (diet) {
          // 1. Check dietaryCategories array
          const byDietaryCat = filtered.filter(r => {
            const dc = r.dietaryCategories || r.dietary_categories || []
            if (!Array.isArray(dc)) return false
            return dc.map((x: any) => String(x).toLowerCase()).includes(diet)
          })
          
          // 2. Check keywords
          const byKeywords = filtered.filter(r => {
            const kw = r.keywords || []
            if (!Array.isArray(kw)) return false
            return kw.some((k: any) => String(k).toLowerCase().includes(diet))
          })
          
          // Combine and deduplicate
          const uniqueIds = Array.from(new Set([...byDietaryCat, ...byKeywords].map(r => r.id)))
          const combined = uniqueIds.map(id => 
            filtered.find(r => r.id === id)
          ).filter(Boolean)
          
          filtered = combined.length > 0 ? combined : filtered
        }
        setRecipes(filtered.length > 0 ? filtered.slice(0, 9) : (recipesData || []).slice(0, 9))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [categorySlug])

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
  const estimateReadTime = (text?: string) => {
    if (!text) return '5'
    const words = text.split(/\s+/).length
    return Math.max(1, Math.round(words / 200))
  }
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
  }

  // Dummy data for 3 essential articles (replace with real data later)
  const essentialArticles = [
    { id: 1, title: 'Begynderguide til Keto', slug: 'begynderguide-til-keto', excerpt: 'Alt du skal vide for at komme i gang med keto-diæten', readTime: 18 },
    { id: 2, title: 'Hvad er ketoner og ketose?', slug: 'hvad-er-ketoner-og-ketose', excerpt: 'Forstå den videnskabelige baggrund for keto', readTime: 15 },
    { id: 3, title: 'Guide til vægttab med keto', slug: 'guide-til-vaegttab-med-keto', excerpt: 'Lær hvordan du taber dig effektivt med keto', readTime: 11 }
  ]

  // Category-specific background colors
  const categoryBgColors: Record<string, string> = {
    keto: '#F6FCFB',
    sense: '#F8F9FA',
    // Add more categories as needed
  }
  const categoryBgColor = categoryBgColors[categorySlug.toLowerCase()] || '#FFFFFF'

  return (
    <div className="min-h-screen bg-white">
      {/* Intro copy */}
      <section className="py-8 bg-white">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3">Det bedste fra {capitalize(categorySlug)} verdenen.</h1>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
              Functionalfoods dækker hvad der sker i mad og ernæringsverdenen inden for {capitalize(categorySlug)}. Her finder du vores eksperters
              uddrag af sundhedsstudier, artikler, {capitalize(categorySlug)} opskrifter, og low carb madprodukter vi er vilde med for tiden.
            </p>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mt-4">
              Vi dækker hvad der rør sig i det danske (og internationale) {categorySlug.toLowerCase()} miljø, og vores videnskabsbaserede journalistik hjælper dig
              med at træffe mere velinformerede madvalg og tabe dig med {capitalize(categorySlug)}.
            </p>
          </div>
        </div>
      </section>
      {/* Hero Section: First Article + Latest 3-4 */}
      <section className="border-b border-gray-200">
        <div className="container py-8 lg:py-12">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* First Article - Large */}
            {firstArticle && (
              <Link href={`/blog/${categorySlug}/${firstArticle.slug}`} className="group">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-200 rounded-lg mb-4">
                  {firstArticle.header_image_url ? (
                    <img src={firstArticle.header_image_url} alt={firstArticle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-sm text-green-600 font-medium mb-2">{firstArticle.category?.name?.toUpperCase() || 'ARTIKLER'} • {estimateReadTime(firstArticle.excerpt)} min læsetid</div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{firstArticle.title}</h1>
                {firstArticle.excerpt && <p className="text-gray-600 text-lg">{firstArticle.excerpt}</p>}
              </Link>
            )}

            {/* Latest 3-4 Articles */}
            <div className="space-y-6">
              {loading ? (
                <div className="text-gray-500">Indlæser…</div>
              ) : latestArticles.length === 0 ? (
                <div className="text-gray-500 text-sm">Ingen seneste artikler.</div>
              ) : (
                latestArticles.map(p => (
                  <Link key={p.id} href={`/blog/${categorySlug}/${p.slug}`} className="group flex gap-4">
                    <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-gray-200">
                      {p.header_image_url ? (
                        <img src={p.header_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-green-600 font-medium mb-1">{p.category?.name?.toUpperCase() || 'ARTIKLER'} • {estimateReadTime(p.excerpt)} min læsetid</div>
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                      {p.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{p.excerpt}</p>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Must Reads Section */}
      {mustReads.length > 0 && (
        <section className="py-12" style={{ backgroundColor: categoryBgColor }}>
          <div className="container">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Must Reads</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mustReads.slice(0, 3).map(p => (
                <Link key={p.id} href={`/blog/${categorySlug}/${p.slug}`} className="group block">
                  <div className="relative aspect-[16/9] overflow-hidden bg-gray-200 rounded-lg mb-4">
                    {p.header_image_url ? (
                      <img src={p.header_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-green-600 font-medium mb-2">{p.category?.name?.toUpperCase() || 'KERNEARTIKEL'} • {estimateReadTime(p.excerpt)} min læsetid</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                  {p.excerpt && <p className="text-gray-600 text-sm line-clamp-2">{p.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Articles List + Popular Articles Sidebar */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Latest Articles with Images (Left - 2 columns) */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Seneste nyt</h2>
              <div className="space-y-6">
                {loading ? (
                  <div className="text-gray-500">Indlæser…</div>
                ) : latestArticles.length === 0 ? (
                  <div className="text-gray-500">Ingen artikler endnu.</div>
                ) : (
                  latestArticles.slice(0, 3).map(p => (
                    <Link key={p.id} href={`/blog/${categorySlug}/${p.slug}`} className="group flex gap-4">
                      <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-gray-200">
                        {p.header_image_url ? (
                          <img src={p.header_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-green-600 font-medium mb-1">{p.category?.name?.toUpperCase() || 'ARTIKLER'} • {estimateReadTime(p.excerpt)} min læsetid</div>
                        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                        {p.excerpt && <p className="text-sm text-gray-600 line-clamp-2 mb-2">{p.excerpt}</p>}
                        <div className="text-xs text-gray-500">By {p.category?.name || 'Redaktion'}</div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Popular Articles (Right - 1 column) */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Populære artikler</h2>
              <div className="space-y-6">
                {loading ? (
                  <div className="text-gray-500">Indlæser…</div>
                ) : popularArticles.length === 0 ? (
                  <div className="text-gray-500 text-sm">Ingen populære artikler endnu.</div>
                ) : (
                  popularArticles.map((p, idx) => (
                    <Link key={p.id} href={`/blog/${categorySlug}/${p.slug}`} className="block group">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl font-bold text-gray-300 flex-shrink-0 w-10">{(idx + 1).toString().padStart(2, '0')}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-green-600 font-medium mb-1">{p.category?.name?.toUpperCase() || 'ARTIKLER'} • {estimateReadTime(p.excerpt)} min læsetid</div>
                          <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                          <div className="text-xs text-gray-500">By {p.category?.name || 'Redaktion'}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA: Madbudget */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Planlæg din mad / vægttab ud fra ugens tilbud</h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">Opret gratis profil og udfyld familieindstillinger</p>
          <Link 
            href="/madbudget"
            className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
          >
            Opret gratis profil
          </Link>
        </div>
      </section>

      {/* Recipes Section */}
      <section className="py-12 bg-white">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Lækre {capitalize(categorySlug)} opskrifter</h2>
            <Link href={`/${categorySlug}/opskrifter`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Se alle opskrifter →</Link>
          </div>
          {loading ? (
            <div className="text-gray-500 text-center py-12">Indlæser…</div>
          ) : recipes.length === 0 ? (
            <div className="text-gray-500 text-center py-12">Ingen opskrifter fundet.</div>
          ) : (
            <div className="relative">
              <div 
                id="hub-recipes-scroll"
                className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide hover:cursor-grab active:cursor-grabbing"
              >
                <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {recipes.map(r => {
                  const formatTime = (min?: number) => {
                    if (!min) return 'N/A'
                    if (min < 60) return `${min} min`
                    const h = Math.floor(min / 60)
                    const m = min % 60
                    return m > 0 ? `${h}t ${m}min` : `${h}t`
                  }
                  const img = (r.imageUrl || r.image_url || '/images/recipes/placeholder.jpg') as string
                  const difficultyColors = r.difficulty === 'Nem' ? 'bg-green-100 text-green-800' :
                                          r.difficulty === 'Mellem' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                  return (
                    <Link 
                      key={r.id} 
                      href={`/opskrift/${r.slug || r.id}`} 
                      className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden flex-shrink-0 w-[85vw] sm:w-auto"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
                        <img src={img} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        {r.rating && (
                          <div className="absolute top-3 right-3 w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {r.rating.toFixed(1)}
                          </div>
                        )}
                        {r.mainCategory && (
                          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                            {r.mainCategory}
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{r.title}</h3>
                        {r.shortDescription && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{r.shortDescription}</p>}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatTime(r.totalTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {r.servings || 1} pers
                            </span>
                          </div>
                          {r.difficulty && (
                            <span className={`px-2 py-1 text-xs font-medium rounded ${difficultyColors}`}>
                              {r.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
                </div>
              </div>
              {/* Mobile swipe arrows */}
              <button
                className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow-md flex items-center justify-center z-10 opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => {
                  const el = document.getElementById('hub-recipes-scroll')
                  if (el) el.scrollBy({ left: -300, behavior: 'smooth' })
                }}
                aria-label="Scroll venstre"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow-md flex items-center justify-center z-10 opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => {
                  const el = document.getElementById('hub-recipes-scroll')
                  if (el) el.scrollBy({ left: 300, behavior: 'smooth' })
                }}
                aria-label="Scroll højre"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
          <style jsx>{`
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>
      </section>

      {/* 3 Essential Articles Section */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="container">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">Praktiske {capitalize(categorySlug)} guides</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {essentialArticles.map((article, idx) => (
              <Link 
                key={article.id} 
                href={`/blog/${categorySlug}/${article.slug}`}
                className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                  <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                    {idx + 1}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{article.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{article.excerpt}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{article.readTime} min læsetid</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Links to Other Pages */}
      <section className="py-12 bg-gray-50 border-t border-gray-200">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link href="/opskriftsoversigt" className="text-center p-6 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-100">
              <div className="text-3xl mb-2">🍳</div>
              <div className="font-semibold text-gray-900">Opskrifter</div>
            </Link>
            <Link href="/dagligvarer" className="text-center p-6 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-100">
              <div className="text-3xl mb-2">🛒</div>
              <div className="font-semibold text-gray-900">Dagligvarer</div>
            </Link>
            <Link href="/madbudget" className="text-center p-6 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-100">
              <div className="text-3xl mb-2">💰</div>
              <div className="font-semibold text-gray-900">Madbudget</div>
            </Link>
            <Link href={`/blog/${categorySlug}`} className="text-center p-6 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-100">
              <div className="text-3xl mb-2">📚</div>
              <div className="font-semibold text-gray-900">{capitalize(categorySlug)} Guides & Blogs</div>
            </Link>
            <Link href="/vægttab" className="text-center p-6 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-100">
              <div className="text-3xl mb-2">⚖️</div>
              <div className="font-semibold text-gray-900">Vægttabsguide</div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
