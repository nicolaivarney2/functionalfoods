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

      console.log('[Widget Render] Related Recipes:', { limit, diet })

      // try to query recipes table; be flexible with field names
      // Try both created_at and updatedAt for ordering
      let recipesData: any[] = []
      const { data, error } = await supabase
        .from('recipes')
        .select('id,title,slug,imageUrl,image_url,dietaryCategories,dietary_categories,mainCategory,status')
        .order('updatedAt', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[Widget Render] Error fetching recipes:', error)
        // Try with created_at as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('recipes')
          .select('id,title,slug,imageUrl,image_url,dietaryCategories,dietary_categories,mainCategory,status')
          .order('created_at', { ascending: false })
          .limit(50)
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

      // Filter by published status if available
      const hasStatusField = recipes.some(r => r.status !== undefined)
      if (hasStatusField) {
        recipes = recipes.filter(r => !r.status || r.status === 'published')
        console.log('[Widget Render] After status filter (published):', recipes.length)
      }

      if (diet) {
        const beforeDietFilter = recipes.length
        recipes = recipes.filter((r) => {
          const dc = r.dietaryCategories || r.dietary_categories || []
          if (!Array.isArray(dc)) return false
          const dcLower = dc.map((x: any) => String(x).toLowerCase())
          return dcLower.includes(diet)
        })
        console.log('[Widget Render] After diet filter (' + diet + '):', recipes.length, '(was', beforeDietFilter + ')')
      }
      // Fallback to latest if filter yields nothing
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
          <div class="widget-related-recipes">
            <h4 class="text-lg font-semibold mb-3">${cfg.title || 'Relaterede opskrifter'}</h4>
            <p class="text-gray-500 text-sm">Ingen relaterede opskrifter fundet.</p>
          </div>
        `
      } else {
        html = `
          <div class="widget-related-recipes">
            <h4 class="text-lg font-semibold mb-3">${cfg.title || 'Relaterede opskrifter'}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              ${recipes
                .map((r) => {
                  const img = r.imageUrl || r.image_url || '/images/recipes/placeholder.jpg'
                  return `<a class="block bg-white rounded shadow hover:shadow-md transition overflow-hidden" href="/opskrift/${r.slug || r.id}">
                    <img src="${img}" alt="${r.title || 'Opskrift'}" class="w-full h-32 object-cover"/>
                    <div class="p-3">
                      <div class="text-sm font-medium text-gray-900">${r.title || 'Opskrift'}</div>
                    </div>
                  </a>`
                })
                .join('')}
            </div>
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


