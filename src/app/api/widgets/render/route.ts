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

      // fetch more than needed to allow scoring by tags
      const { data } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,tags,category:blog_categories(slug)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(30)
      let items: any[] = (data || [])
        .filter((p: any) => !currentSlug || p.slug !== currentSlug)

      // prefer same category if provided
      if (categorySlug) {
        const sameCat = items.filter((p: any) => (p.category?.slug || '').toLowerCase() === String(categorySlug).toLowerCase())
        if (sameCat.length > 0) items = sameCat
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
      html = `
        <div class="widget-related-posts">
          <h4 class="text-lg font-semibold mb-3">${cfg.title || 'Relaterede artikler'}</h4>
          <ul class="space-y-2">
            ${items.map((p: any) => `<li><a class="text-blue-700 hover:text-blue-900" href="/blog/${p.category?.slug || 'keto'}/${p.slug}">${p.title}</a></li>`).join('')}
          </ul>
        </div>
      `
    } else if (type === 'related_recipes') {
      const limit = Number(cfg.limit || 6)
      const diet = (cfg.category || context?.categorySlug || '').toString().toLowerCase()
      // try to query recipes table; be flexible with field names
      const { data } = await supabase
        .from('recipes')
        .select('id,title,slug,image_url,imageUrl,dietary_categories,dietaryCategories,mainCategory')
        .order('created_at', { ascending: false })
        .limit(50)

      let recipes: any[] = data || []
      if (diet) {
        recipes = recipes.filter((r) => {
          const dc = r.dietary_categories || r.dietaryCategories || []
          return Array.isArray(dc) && dc.map((x: any) => String(x).toLowerCase()).includes(diet)
        })
      }
      // Fallback to latest if filter yields nothing
      if (recipes.length === 0) {
        recipes = (data || [])
      }
      recipes = recipes.slice(0, limit)
      html = `
        <div class="widget-related-recipes">
          <h4 class="text-lg font-semibold mb-3">${cfg.title || 'Relaterede opskrifter'}</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${recipes
              .map((r) => {
                const img = r.image_url || r.imageUrl || '/images/recipes/placeholder.jpg'
                return `<a class="block bg-white rounded shadow hover:shadow-md transition overflow-hidden" href="/opskrift/${r.slug}">
                  <img src="${img}" alt="${r.title}" class="w-full h-32 object-cover"/>
                  <div class="p-3">
                    <div class="text-sm font-medium text-gray-900">${r.title}</div>
                  </div>
                </a>`
              })
              .join('')}
          </div>
        </div>
      `
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


