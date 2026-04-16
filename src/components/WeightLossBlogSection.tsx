'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'
import { ArrowRight, BookOpen } from 'lucide-react'

type HubPost = {
  id: number
  title: string
  slug: string
  excerpt?: string
  header_image_url?: string
  category?: { slug: string; name: string } | null
}

/** slug `null` = vis seneste på tværs af alle kategorier */
const TOPIC_FILTERS: { slug: string | null; label: string; shortLabel?: string }[] = [
  { slug: null, label: 'Alle emner', shortLabel: 'Alle' },
  { slug: 'mentalt', label: 'Mentalt & vaner', shortLabel: 'Mentalt' },
  { slug: 'keto', label: 'Keto' },
  { slug: 'sense', label: 'Sense' },
  { slug: 'glp-1', label: 'GLP-1 kost', shortLabel: 'GLP-1' },
  { slug: 'anti-inflammatory', label: 'Anti-inflammatorisk', shortLabel: 'Anti-infl.' },
  { slug: 'flexitarian', label: 'Fleksitarisk' },
  { slug: '5-2-diet', label: '5:2', shortLabel: '5:2' },
  { slug: 'familie', label: 'Kalorietælling', shortLabel: 'Familie' },
  { slug: 'proteinrig-kost', label: 'Proteinrig kost', shortLabel: 'Protein' },
]

function estimateReadTime(text?: string) {
  if (!text) return '5'
  const words = text.split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

export default function WeightLossBlogSection() {
  const [posts, setPosts] = useState<HubPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const loadPosts = useCallback(async (categorySlug: string | null) => {
    setLoading(true)
    const supabase = createSupabaseClient()

    try {
      if (!categorySlug) {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,header_image_url,category:blog_categories(slug,name)')
          .eq('status', 'published')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(6)

        if (error) {
          console.error('WeightLossBlogSection:', error)
          setPosts([])
          return
        }

        const mapped = (data || []).map((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category
          return { ...p, category: cat }
        })
        setPosts(mapped)
        return
      }

      const { data: catRow, error: catErr } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle()

      if (catErr || !catRow?.id) {
        setPosts([])
        return
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,header_image_url,category:blog_categories(slug,name)')
        .eq('status', 'published')
        .eq('category_id', (catRow as { id: number }).id)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(6)

      if (error) {
        console.error('WeightLossBlogSection:', error)
        setPosts([])
        return
      }

      const mapped = (data || []).map((p: any) => {
        const cat = Array.isArray(p.category) ? p.category[0] : p.category
        return { ...p, category: cat }
      })
      setPosts(mapped)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts(selectedSlug)
  }, [selectedSlug, loadPosts])

  const withCategory = posts.filter(
    (p): p is HubPost & { category: { slug: string; name: string } } => !!p.category?.slug
  )

  const blogHubHref = selectedSlug ? `/blog/${selectedSlug}` : '/blog/mentalt'

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 border-b border-gray-100">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-8 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-green-700 font-medium mb-3">
            <BookOpen className="w-5 h-5" />
            Blog
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Artikler om vægttab – på tværs af kostformer
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Her kan du læse videre i dit eget tempo – på tværs af emner eller inden for én madstil. Vælg et emne for at
            indsnævre, eller se det seneste på tværs.
          </p>
        </div>

        {/* Filter – øverst */}
        <div className="mb-10">
          <p className="text-center text-sm font-medium text-gray-500 mb-3">Filtrér efter emne</p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-4xl mx-auto">
            {TOPIC_FILTERS.map(({ slug, label, shortLabel }) => {
              const active = selectedSlug === slug
              return (
                <button
                  key={slug ?? 'alle'}
                  type="button"
                  onClick={() => setSelectedSlug(slug)}
                  aria-pressed={active}
                  className={[
                    'rounded-full px-3.5 py-2 text-sm font-semibold transition-all border-2',
                    'min-h-[40px] sm:min-h-0',
                    active
                      ? 'bg-green-600 text-white border-green-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:text-green-800',
                  ].join(' ')}
                >
                  <span className="sm:hidden">{shortLabel ?? label}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Kun selve blog-kortene sløres – filtre og CTA-link ovenfor/nedenfor forbliver skarpe */}
        <div className="relative mb-10 min-h-[12rem] rounded-2xl">
          <div
            className="pointer-events-none select-none blur-md sm:blur-[10px]"
            aria-hidden
          >
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : withCategory.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/80">
                <p className="text-gray-600 mb-4">
                  Ingen artikler at vise her lige nu{selectedSlug ? ' i denne kategori' : ''}.
                </p>
                {selectedSlug && (
                  <span className="inline-flex items-center gap-2 text-green-700 font-semibold">
                    Åbn hele blog-sektionen for dette emne
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {withCategory.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="group flex flex-col bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
                    >
                      <div className="relative aspect-[16/10] bg-gray-200 overflow-hidden">
                        {p.header_image_url ? (
                          <img
                            src={p.header_image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <BookOpen className="w-16 h-16 opacity-40" />
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="text-xs text-green-600 font-medium mb-2">
                          {(p.category?.name || 'Artikel').toUpperCase()} · {estimateReadTime(p.excerpt)} min
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{p.title}</h3>
                        {p.excerpt && <p className="text-sm text-gray-600 line-clamp-2 flex-1">{p.excerpt}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/55 px-4"
            role="status"
            aria-live="polite"
          >
            <p className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 drop-shadow-sm">
              Blogs på vej
            </p>
          </div>
        </div>

        <p className="text-center">
          <Link
            href={blogHubHref}
            className="inline-flex items-center gap-2 text-gray-700 font-semibold hover:text-green-700 transition-colors"
          >
            {selectedSlug ? 'Se flere artikler i denne blog-sektion' : 'Se flere artikler på bloggen'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </p>
      </div>
    </section>
  )
}
