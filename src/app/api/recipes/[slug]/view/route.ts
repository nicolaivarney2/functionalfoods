import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { databaseService } from '@/lib/database-service'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Registrer én sidevisning for en udgiven opskrift (øger "pageViews" med 1).
 * Bruges fra klient ved mount; fejl må ikke bryde siden.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ error: 'Slug mangler' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    })

    const { data: row, error: fetchError } = await supabase
      .from('recipes')
      .select('id, pageViews, slug')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (fetchError) {
      console.error('recipe view fetch:', fetchError)
      return NextResponse.json(
        { error: 'Kunne ikke hente opskrift', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!row?.id) {
      return NextResponse.json({ error: 'Opskrift ikke fundet' }, { status: 404 })
    }

    const r = row as { id: string; pageViews?: number; pageviews?: number }
    const rawCurrent = r.pageViews ?? r.pageviews
    const current = typeof rawCurrent === 'number' && Number.isFinite(rawCurrent) ? rawCurrent : 0
    const next = current + 1

    const { data: updated, error: updateError } = await supabase
      .from('recipes')
      .update({ pageViews: next, updatedAt: new Date().toISOString() })
      .eq('id', row.id)
      .select('pageViews')
      .single()

    if (updateError) {
      console.error('recipe view update:', updateError)
      if (
        updateError.message?.includes('pageViews') ||
        updateError.message?.includes('column') ||
        updateError.code === '42703'
      ) {
        return NextResponse.json(
          {
            error: 'Kolonnen pageViews findes ikke',
            hint: 'Kør scripts/sql/add-recipe-pageViews.sql i Supabase',
          },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: 'Kunne ikke opdatere visninger', details: updateError.message },
        { status: 500 }
      )
    }

    const u = updated as { pageViews?: number | string; pageviews?: number | string } | null
    const rawOut = u?.pageViews ?? u?.pageviews
    const pageViews =
      typeof rawOut === 'number' && Number.isFinite(rawOut)
        ? Math.floor(rawOut)
        : typeof rawOut === 'string' && rawOut.trim() !== ''
          ? Math.floor(Number(rawOut))
          : next

    databaseService.clearRecipeCaches()
    revalidatePath(`/opskrift/${slug}`, 'page')

    return NextResponse.json({ pageViews: Number(pageViews) })
  } catch (e) {
    console.error('POST /api/recipes/[slug]/view:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
