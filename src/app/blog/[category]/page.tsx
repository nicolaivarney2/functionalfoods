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

  const [featured, setFeatured] = useState<HubPost[]>([])
  const [latest, setLatest] = useState<HubPost[]>([])
  const [recipes, setRecipes] = useState<HubRecipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Featured core articles (post_type = core)
        const { data: corePosts } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,post_type,view_count,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .eq('post_type', 'core')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(6)

        const featuredFiltered = (corePosts || []).filter((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return cat?.slug === categorySlug
        }).map((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return { ...p, category: cat }
        })
        setFeatured(featuredFiltered)

        // Latest blog posts for category
        const { data: latestPosts } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,post_type,published_at,view_count,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(12)

        const latestFiltered = (latestPosts || []).filter((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return cat?.slug === categorySlug
        }).map((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return { ...p, category: cat }
        })
        setLatest(latestFiltered)

        // Recipes matching dietary category (fallback to latest)
        const { data: recipesData } = await supabase
          .from('recipes')
          .select('id,title,slug,imageUrl,image_url,shortDescription,totalTime,servings,difficulty,dietaryCategories,mainCategory,rating')
          .order('updatedAt', { ascending: false })
          .limit(24)

        const diet = (categorySlug || '').toLowerCase()
        let filtered = (recipesData || [])
        if (diet) {
          filtered = filtered.filter(r => Array.isArray(r.dietaryCategories) && r.dietaryCategories.map(x => String(x).toLowerCase()).includes(diet))
        }
        setRecipes(filtered.length > 0 ? filtered.slice(0, 9) : (recipesData || []).slice(0, 9))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [categorySlug])

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('da-DK', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  const estimateReadTime = (text?: string) => {
    if (!text) return '5'
    const words = text.split(/\s+/).length
    return Math.max(1, Math.round(words / 200))
  }

  const featuredPost = featured[0]
  const otherFeatured = featured.slice(1, 4)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Featured Post */}
      {featuredPost && (
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="container py-16">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm mb-4">KERNEARTIKEL</div>
                <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">{featuredPost.title}</h1>
                {featuredPost.excerpt && <p className="text-gray-300 text-lg mb-6 line-clamp-3">{featuredPost.excerpt}</p>}
                <div className="flex items-center gap-4 text-sm text-gray-300 mb-6">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {estimateReadTime(featuredPost.excerpt)} min læsetid
                  </span>
                  {featuredPost.view_count && (
                    <span>{featuredPost.view_count.toLocaleString('da-DK')} visninger</span>
                  )}
                </div>
                <Link 
                  href={`/blog/${categorySlug}/${featuredPost.slug}`}
                  className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                >
                  Læs artikel →
                </Link>
              </div>
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-700">
                {/* Placeholder for featured image - you can add header_image_url later */}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Kerneartikler Grid */}
      {otherFeatured.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Kerneartikler</h2>
              <Link href={`/blog/${categorySlug}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Se alle →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherFeatured.map(p => (
                <Link 
                  key={p.id} 
                  href={`/blog/${categorySlug}/${p.slug}`} 
                  className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-gray-200">
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">KERNEARTIKEL</div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                    {p.excerpt && <p className="text-gray-600 text-sm mb-4 line-clamp-2">{p.excerpt}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {estimateReadTime(p.excerpt)} min
                      </span>
                      {p.view_count && <span>{p.view_count.toLocaleString('da-DK')} visninger</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Posts */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">SENESTE ARTIKLER</h2>
            <Link href={`/blog/${categorySlug}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Alle artikler →</Link>
          </div>
          {loading ? (
            <div className="text-gray-500 text-center py-12">Indlæser…</div>
          ) : latest.length === 0 ? (
            <div className="text-gray-500 text-center py-12">Ingen artikler endnu.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latest.map(p => (
                <Link 
                  key={p.id} 
                  href={`/blog/${categorySlug}/${p.slug}`} 
                  className="group block bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-5"
                >
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                  {p.excerpt && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{p.excerpt}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {estimateReadTime(p.excerpt)} min læsetid
                    </span>
                    {p.view_count && <span>• {p.view_count.toLocaleString('da-DK')} visninger</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related Recipes */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden"
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
          )}
        </div>
      </section>
    </div>
  )
}


