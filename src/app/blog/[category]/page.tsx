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
  category?: { slug: string; name: string }
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
          .select('id,title,slug,excerpt,post_type,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .eq('post_type', 'core')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(6)

        setFeatured((corePosts || []).filter(p => p.category?.slug === categorySlug))

        // Latest blog posts for category
        const { data: latestPosts } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,post_type,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(12)

        setLatest((latestPosts || []).filter(p => p.category?.slug === categorySlug))

        // Recipes matching dietary category (fallback to latest)
        const { data: recipesData } = await supabase
          .from('recipes')
          .select('id,title,slug,imageUrl,image_url,shortDescription,totalTime,servings,difficulty,dietaryCategories')
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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 to-sky-50">
        <div className="container py-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{capitalize(categorySlug)} – Blog</h1>
          <p className="mt-3 text-gray-600 max-w-2xl">Dyk ned i guides, artikler og inspiration om {capitalize(categorySlug)}. Find kerneartikler, blogs og relaterede opskrifter.</p>
        </div>
      </section>

      {/* Featured Core Articles */}
      <section className="py-10">
        <div className="container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Kerneartikler</h2>
            <Link href={`/blog/${categorySlug}`} className="text-blue-600 hover:text-blue-800 text-sm">Se alle</Link>
          </div>
          {loading ? (
            <div className="text-gray-500">Indlæser…</div>
          ) : featured.length === 0 ? (
            <div className="text-gray-500 text-sm">Ingen kerneartikler endnu.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map(p => (
                <Link key={p.id} href={`/blog/${categorySlug}/${p.slug}`} className="block bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden">
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{p.title}</h3>
                    {p.excerpt && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Posts */}
      <section className="py-6 bg-gray-50">
        <div className="container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Seneste artikler</h2>
            <Link href={`/blog/${categorySlug}`} className="text-blue-600 hover:text-blue-800 text-sm">Alle artikler</Link>
          </div>
          {loading ? (
            <div className="text-gray-500">Indlæser…</div>
          ) : latest.length === 0 ? (
            <div className="text-gray-500 text-sm">Ingen artikler endnu.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latest.map(p => (
                <Link key={p.id} href={`/blog/${categorySlug}/${p.slug}`} className="block bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition p-5">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{p.title}</h3>
                  {p.excerpt && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.excerpt}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related Recipes */}
      <section className="py-10">
        <div className="container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Opskrifter til {capitalize(categorySlug)}</h2>
            <Link href={`/${categorySlug}/opskrifter`} className="text-blue-600 hover:text-blue-800 text-sm">Se alle opskrifter</Link>
          </div>
          {loading ? (
            <div className="text-gray-500">Indlæser…</div>
          ) : recipes.length === 0 ? (
            <div className="text-gray-500 text-sm">Ingen opskrifter fundet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map(r => (
                <Link key={r.id} href={`/opskrift/${r.slug || r.id}`} className="block bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
                    <img src={(r.imageUrl || r.image_url || '/images/recipes/placeholder.jpg') as string} alt={r.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{r.title}</h3>
                    {r.shortDescription && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{r.shortDescription}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}


