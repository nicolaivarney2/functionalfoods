import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getAuthenticatedUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  const authHeader = request.headers.get('authorization')
  let user: { id: string } | null = null

  if (authHeader?.startsWith('Bearer ')) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: u }, error } = await supabase.auth.getUser(token)
    if (!error && u) user = u
  }

  if (!user) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )
    const { data: { user: u }, error } = await supabase.auth.getUser()
    if (!error && u) user = u
  }

  return user
}

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createServerClient(supabaseUrl, serviceKey, {
    cookies: {
      get() {
        return undefined
      },
      set() {},
      remove() {},
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const { slug, commentId } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Du skal være logget ind for at like' }, { status: 401 })
    }

    const supabase = getServiceSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verificer at kommentaren findes på den angivne opskrift, så vi ikke
    // kan slynge likes ind på vilkårlige IDs.
    const { data: comment, error: lookupError } = await supabase
      .from('recipe_comments')
      .select('id, recipe_slug')
      .eq('id', commentId)
      .maybeSingle()

    if (lookupError) {
      console.error('like lookup error', lookupError)
      return NextResponse.json({ error: 'Kunne ikke finde kommentar' }, { status: 500 })
    }
    if (!comment || comment.recipe_slug !== slug) {
      return NextResponse.json({ error: 'Kommentar findes ikke' }, { status: 404 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('recipe_comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError) {
      console.error('like existing check error', existingError)
      return NextResponse.json({ error: 'Kunne ikke tjekke like-status' }, { status: 500 })
    }

    let liked: boolean
    if (existing) {
      const { error: deleteError } = await supabase
        .from('recipe_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
      if (deleteError) {
        console.error('like delete error', deleteError)
        return NextResponse.json({ error: 'Kunne ikke fjerne like' }, { status: 500 })
      }
      liked = false
    } else {
      const { error: insertError } = await supabase
        .from('recipe_comment_likes')
        .insert({ comment_id: commentId, user_id: user.id })
      if (insertError) {
        // Idempotent ved race condition (PK violation)
        if (insertError.code !== '23505') {
          console.error('like insert error', insertError)
          return NextResponse.json({ error: 'Kunne ikke like' }, { status: 500 })
        }
      }
      liked = true
    }

    const { count, error: countError } = await supabase
      .from('recipe_comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    if (countError) {
      console.error('like count error', countError)
    }

    return NextResponse.json({ liked, likes: count ?? 0 })
  } catch (e) {
    console.error('POST recipe comment like error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
