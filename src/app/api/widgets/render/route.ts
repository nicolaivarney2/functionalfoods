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
      let query = supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,category:blog_categories(slug)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (categorySlug) {
        query = query.eq('category:blog_categories.slug', categorySlug)
      }
      const { data } = await query
      const items = data || []
      html = `
        <div class="widget-related-posts">
          <h4 class="text-lg font-semibold mb-3">${cfg.title || 'Relaterede artikler'}</h4>
          <ul class="space-y-2">
            ${items.map((p: any) => `<li><a class="text-blue-700 hover:text-blue-900" href="/blog/${p.category?.slug || 'keto'}/${p.slug}">${p.title}</a></li>`).join('')}
          </ul>
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


