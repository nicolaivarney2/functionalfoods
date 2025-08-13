import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { downloadAndStoreImage } from '@/lib/image-downloader'

export async function POST(request: NextRequest) {
  try {
    const { limit } = await request.json().catch(() => ({ limit: 200 }))

    // Fetch recipes with external image URLs
    const { data: recipes, error } = await supabaseServer
      .from('recipes')
      .select('id, slug, title, imageurl')
      .limit(typeof limit === 'number' ? limit : 200)

    if (error) {
      return NextResponse.json({ success: false, message: 'Failed to fetch recipes', error: error.message }, { status: 500 })
    }

    const targets = (recipes || []).filter(r => typeof r.imageurl === 'string' && r.imageurl.startsWith('http'))
    let processed = 0
    let updated = 0
    const results: Array<{ id: string; slug: string; from: string; to?: string; error?: string }> = []

    for (const r of targets) {
      processed++
      try {
        const res = await downloadAndStoreImage(r.imageurl as string, r.slug as string)
        if (res.success && res.localPath) {
          const { error: updErr } = await supabaseServer
            .from('recipes')
            .update({ imageurl: res.localPath, updated_at: new Date().toISOString() })
            .eq('id', r.id)
          if (!updErr) {
            updated++
            results.push({ id: String(r.id), slug: r.slug as string, from: r.imageurl as string, to: res.localPath })
          } else {
            results.push({ id: String(r.id), slug: r.slug as string, from: r.imageurl as string, error: updErr.message })
          }
        } else {
          results.push({ id: String(r.id), slug: r.slug as string, from: r.imageurl as string, error: res.error || 'download failed' })
        }
      } catch (e: any) {
        results.push({ id: String(r.id), slug: r.slug as string, from: r.imageurl as string, error: e?.message || 'unknown error' })
      }
    }

    return NextResponse.json({ success: true, scanned: recipes?.length || 0, processed, updated, results })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function GET() {
  // Convenience GET to process defaults
  const fakeReq = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ limit: 500 }) }) as any
  // @ts-ignore
  return POST(fakeReq)
}


