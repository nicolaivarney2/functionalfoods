import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { id, type, config, context } = await req.json()
    const cfg = config || {}

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, html: '<div class="blog-widget-error">Konfiguration mangler</div>' })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    let html = ''

    if (type === 'related_posts') {
      const limit = Number(cfg.limit || 3)
      const categorySlug = cfg.category || context?.categorySlug
      const currentSlug = context?.slug
      const contextTags: string[] = Array.isArray(cfg.tags) ? cfg.tags : (context?.tags || [])

      console.log('[Widget Render] Related Posts:', { limit, categorySlug, currentSlug, contextTags })

      // fetch more than needed to allow scoring by tags
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,tags,category:blog_categories(slug)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) {
        console.error('[Widget Render] Error fetching posts:', error)
      }

      let items: any[] = (data || [])
        .filter((p: any) => !currentSlug || p.slug !== currentSlug)

      console.log('[Widget Render] Posts after exclude current:', items.length)

      // prefer same category if provided
      if (categorySlug) {
        const sameCat = items.filter((p: any) => (p.category?.slug || '').toLowerCase() === String(categorySlug).toLowerCase())
        if (sameCat.length > 0) {
          items = sameCat
          console.log('[Widget Render] Filtered to same category:', items.length)
        }
      }

      if (contextTags && contextTags.length > 0) {
        const tagsLower = contextTags.map((t) => String(t).toLowerCase())
        items = items
          .map((p) => ({
            ...p,
            _score: Array.isArray(p.tags)
              ? p.tags.reduce((acc: number, t: string) => acc + (tagsLower.includes(String(t).toLowerCase()) ? 1 : 0), 0)
              : 0
          }))
          .sort((a, b) => b._score - a._score)
      }
      items = items.slice(0, limit)

      console.log('[Widget Render] Final posts to render:', items.length)

      if (items.length === 0) {
        html = `
          <div class="widget-related-posts">
            <h4 class="text-lg font-semibold mb-3">${cfg.title || 'Relaterede artikler'}</h4>
            <p class="text-gray-500 text-sm">Ingen relaterede artikler fundet.</p>
          </div>
        `
      } else {
        html = `
          <div class="widget-related-posts">
            <h4 class="text-lg font-semibold mb-3">${cfg.title || 'Relaterede artikler'}</h4>
            <ul class="space-y-2">
              ${items.map((p: any) => `<li><a class="text-blue-700 hover:text-blue-900" href="/blog/${p.category?.slug || 'keto'}/${p.slug}">${p.title}</a></li>`).join('')}
            </ul>
          </div>
        `
      }
    } else if (type === 'related_recipes') {
      const limit = Number(cfg.limit || 6)
      const diet = (cfg.category || context?.categorySlug || '').toString().toLowerCase()
      const blogTags: string[] = Array.isArray(context?.tags) ? context.tags : []

      console.log('[Widget Render] Related Recipes:', { limit, diet, blogTags })

      // try to query recipes table; be flexible with field names
      // Try both created_at and updatedAt for ordering
      let recipesData: any[] = []
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('updatedAt', { ascending: false })
        .limit(100)

      if (error) {
        console.error('[Widget Render] Error fetching recipes:', error)
        // Try with created_at as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (fallbackError) {
          console.error('[Widget Render] Fallback query also failed:', fallbackError)
          recipesData = []
        } else {
          console.log('[Widget Render] Fallback query succeeded:', fallbackData?.length || 0, 'recipes')
          recipesData = fallbackData || []
        }
      } else {
        console.log('[Widget Render] Recipes fetched:', data?.length || 0)
        recipesData = data || []
      }

      let recipes: any[] = recipesData
      console.log('[Widget Render] All recipes before filtering:', recipes.length)

      // Filter by published status if available (but don't exclude if status field doesn't exist)
      const hasStatusField = recipes.some(r => r.status !== undefined)
      if (hasStatusField) {
        const beforeStatus = recipes.length
        recipes = recipes.filter(r => !r.status || r.status === 'published')
        console.log('[Widget Render] After status filter (published):', recipes.length, '(was', beforeStatus + ')')
      } else {
        console.log('[Widget Render] No status field found, skipping status filter')
      }

      // Score recipes by relevance: tags > dietaryCategories > latest
      if (blogTags.length > 0 || diet) {
        const blogTagsLower = blogTags.map(t => String(t).toLowerCase())
        recipes = recipes.map((r) => {
          let score = 0
          
          // Score by tags/keywords match (highest priority)
          const keywords = r.keywords || []
          if (Array.isArray(keywords)) {
            const keywordsLower = keywords.map((k: any) => String(k).toLowerCase())
            blogTagsLower.forEach(tag => {
              if (keywordsLower.some((k: string) => k.includes(tag) || tag.includes(k))) score += 10
            })
          }
          
          // Score by dietary category match
          if (diet) {
            const dc = r.dietaryCategories || r.dietary_categories || []
            if (Array.isArray(dc)) {
              const dcLower = dc.map((x: any) => String(x).toLowerCase())
              if (dcLower.includes(diet)) score += 5
            }
          }
          
          return { ...r, _relevanceScore: score }
        }).sort((a, b) => b._relevanceScore - a._relevanceScore)
        
        console.log('[Widget Render] After relevance scoring, top scores:', recipes.slice(0, 3).map(r => ({ title: r.title, score: r._relevanceScore })))
      }

      // If we have matches with score > 0, use those; otherwise fallback to latest
      const scoredMatches = recipes.filter(r => r._relevanceScore > 0)
      if (scoredMatches.length > 0) {
        recipes = scoredMatches
        console.log('[Widget Render] Using scored matches:', recipes.length)
      } else if (diet) {
        // Try dietary category filter as fallback
        const beforeDietFilter = recipes.length
        recipes = recipes.filter((r) => {
          const dc = r.dietaryCategories || r.dietary_categories || []
          if (!Array.isArray(dc)) return false
          const dcLower = dc.map((x: any) => String(x).toLowerCase())
          return dcLower.includes(diet)
        })
        console.log('[Widget Render] After diet filter (' + diet + '):', recipes.length, '(was', beforeDietFilter + ')')
      }
      
      // Final fallback to latest published if no matches
      if (recipes.length === 0 && recipesData.length > 0) {
        recipes = [...recipesData]
        if (hasStatusField) {
          recipes = recipes.filter(r => !r.status || r.status === 'published')
        }
        console.log('[Widget Render] Using fallback (all published):', recipes.length)
      }
      
      recipes = recipes.slice(0, limit)

      console.log('[Widget Render] Final recipes to render:', recipes.length)

      if (recipes.length === 0) {
        html = `
          <div class="widget-related-recipes mt-8 mb-8">
            <h4 class="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">${cfg.title || 'Relaterede opskrifter'}</h4>
            <p class="text-gray-500 text-sm">Ingen relaterede opskrifter fundet.</p>
          </div>
        `
      } else {
        const formatTime = (minutes: number | undefined) => {
          if (!minutes) return 'N/A'
          if (minutes < 60) return `${minutes} min`
          const hours = Math.floor(minutes / 60)
          const mins = minutes % 60
          return mins > 0 ? `${hours}t ${mins}min` : `${hours}t`
        }

        const escapeHtml = (text: string | undefined | null): string => {
          if (!text) return ''
          const div = { textContent: text } as any
          return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
        }

        const recipeCards = recipes
          .map((r) => {
            const img = (r.imageUrl || r.image_url || '/images/recipes/placeholder.jpg').replace(/"/g, '&quot;')
            const totalTime = r.totalTime || r.cookingTime || r.preparationTime || 0
            const servings = r.servings || 1
            const shortDesc = escapeHtml(r.shortDescription || r.description || '')
            const title = escapeHtml(r.title || 'Opskrift')
            const difficulty = escapeHtml(r.difficulty || '')
            const slug = (r.slug || r.id || '').replace(/"/g, '&quot;')
            const difficultyClass = difficulty === 'Nem' ? 'bg-green-100 text-green-800' :
                                  difficulty === 'Mellem' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
            
            return `<article class="recipe-card bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden flex-shrink-0 w-[85vw] sm:w-auto">
              <a href="/opskrift/${slug}" class="block">
                <div class="relative aspect-[4/3] overflow-hidden bg-gray-200">
                  <img 
                    src="${img}" 
                    alt="${title}" 
                    class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div class="p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
                    ${title}
                  </h3>
                  ${shortDesc ? `<p class="text-gray-600 text-sm mb-4 line-clamp-2">${shortDesc}</p>` : ''}
                  <div class="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <div class="flex items-center space-x-4">
                      <div class="flex items-center space-x-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>${formatTime(totalTime)}</span>
                      </div>
                      <div class="flex items-center space-x-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        <span>${servings} pers</span>
                      </div>
                    </div>
                    ${difficulty ? `<span class="px-2 py-1 text-xs font-medium rounded ${difficultyClass}">${difficulty}</span>` : ''}
                  </div>
                </div>
              </a>
            </article>`
          })
          .join('')

        html = `
          <div class="widget-related-recipes mt-8 mb-8">
            <h4 class="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">${escapeHtml(cfg.title) || 'Relaterede opskrifter'}</h4>
            <!-- Mobile: Horizontal scroll -->
            <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide hover:cursor-grab active:cursor-grabbing">
              <div class="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                ${recipeCards}
              </div>
            </div>
            <style>
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            </style>
          </div>
        `
      }
    } else if (type === 'newsletter_signup') {
      html = `
        <div class="widget-newsletter p-4 rounded-md border border-blue-200 bg-blue-50">
          <h4 class="text-lg font-semibold mb-1">${cfg.title || 'Tilmeld nyhedsbrev'}</h4>
          <p class="text-sm text-blue-900 mb-3">${cfg.subtitle || 'Få nye artikler direkte i din inbox.'}</p>
          <form action="${cfg.action || '#'}" method="post" class="flex gap-2">
            <input type="email" name="email" required placeholder="Din email" class="flex-1 px-3 py-2 rounded border border-blue-300" />
            <button type="submit" class="px-3 py-2 rounded bg-blue-600 text-white">${cfg.button || 'Tilmeld'}</button>
          </form>
        </div>
      `
    } else if (type === 'cta_button') {
      html = `
        <div class="widget-cta text-center">
          <a href="${cfg.href || '#'}" class="inline-block px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600">${cfg.label || 'Læs mere'}</a>
        </div>
      `
    } else {
      html = `<div class="blog-widget-note">Widget understøttes ikke endnu.</div>`
    }

    return NextResponse.json({ success: true, html })
  } catch (e) {
    return NextResponse.json({ success: false, html: '<div class="blog-widget-error">Fejl ved indlæsning af widget</div>' })
  }
}


