import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

type DbComment = {
  id: string
  recipe_slug: string
  parent_id: string | null
  author_id: string
  author_name: string
  content: string
  created_at: string
}

type CommentResponse = {
  id: string
  author: string
  authorId: string
  content: string
  timestamp: string
  likes: number
  isLiked: boolean
  replies: CommentResponse[]
}

async function getAuthenticatedUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  const authHeader = request.headers.get('authorization')
  let user: { id: string; user_metadata?: Record<string, unknown> } | null = null

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
  // Use createServerClient with the service key so we can run privileged reads/writes,
  // mirroring the pattern in personal-tips/route.ts.
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = getServiceSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Vi kan altid hente likes/comments med service-key. Find ud af om den nuværende
    // bruger er logget ind, så vi kan markere "isLiked" pr. kommentar.
    const currentUser = await getAuthenticatedUser(request)

    const { data: rawComments, error: commentsError } = await supabase
      .from('recipe_comments')
      .select('id, recipe_slug, parent_id, author_id, author_name, content, created_at')
      .eq('recipe_slug', slug)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('recipe_comments select error', commentsError)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    const comments = (rawComments ?? []) as DbComment[]
    const ids = comments.map((c) => c.id)

    let likeCounts = new Map<string, number>()
    let likedByMe = new Set<string>()

    if (ids.length > 0) {
      const { data: likeRows, error: likesError } = await supabase
        .from('recipe_comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', ids)

      if (likesError) {
        console.error('recipe_comment_likes select error', likesError)
      } else if (likeRows) {
        likeCounts = likeRows.reduce((acc: Map<string, number>, row) => {
          acc.set(row.comment_id, (acc.get(row.comment_id) ?? 0) + 1)
          return acc
        }, new Map<string, number>())

        if (currentUser) {
          likedByMe = new Set(
            likeRows.filter((r) => r.user_id === currentUser.id).map((r) => r.comment_id)
          )
        }
      }
    }

    // Byg trælignende struktur: topniveau-kommentarer med replies under sig.
    const byId = new Map<string, CommentResponse>()
    const topLevel: CommentResponse[] = []

    for (const c of comments) {
      byId.set(c.id, {
        id: c.id,
        author: c.author_name,
        authorId: c.author_id,
        content: c.content,
        timestamp: c.created_at,
        likes: likeCounts.get(c.id) ?? 0,
        isLiked: likedByMe.has(c.id),
        replies: [],
      })
    }

    for (const c of comments) {
      const node = byId.get(c.id)!
      if (c.parent_id && byId.has(c.parent_id)) {
        byId.get(c.parent_id)!.replies.push(node)
      } else {
        topLevel.push(node)
      }
    }

    // Vis nyeste topniveau-kommentarer først, men svar i kronologisk rækkefølge.
    topLevel.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ comments: topLevel })
  } catch (e) {
    console.error('GET recipe comments error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Du skal være logget ind for at kommentere' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const parentId =
      typeof body.parentId === 'string' && body.parentId.length > 0 ? body.parentId : null

    if (!content) {
      return NextResponse.json({ error: 'Kommentaren må ikke være tom' }, { status: 400 })
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: 'Kommentaren er for lang (maks 5000 tegn)' }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Hvis det er et svar, så valider at parent eksisterer på samme opskrift,
    // og kun tillad én niveau af threading (parent må ikke selv være et svar).
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('recipe_comments')
        .select('id, recipe_slug, parent_id')
        .eq('id', parentId)
        .maybeSingle()

      if (parentError) {
        console.error('parent lookup error', parentError)
        return NextResponse.json({ error: 'Kunne ikke validere parent-kommentar' }, { status: 500 })
      }
      if (!parent || parent.recipe_slug !== slug) {
        return NextResponse.json({ error: 'Ukendt parent-kommentar' }, { status: 400 })
      }
      if (parent.parent_id) {
        return NextResponse.json({ error: 'Du kan kun svare på en topniveau-kommentar' }, { status: 400 })
      }
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const rawName = (metadata.name ?? metadata.full_name ?? metadata.display_name) as string | undefined
    const authorName = (rawName && rawName.trim()) || 'Anonym'

    const { data: inserted, error: insertError } = await supabase
      .from('recipe_comments')
      .insert({
        recipe_slug: slug,
        parent_id: parentId,
        author_id: user.id,
        author_name: authorName,
        content,
      })
      .select('id, recipe_slug, parent_id, author_id, author_name, content, created_at')
      .single()

    if (insertError || !inserted) {
      console.error('recipe_comments insert error', insertError)
      return NextResponse.json({ error: 'Kunne ikke gemme kommentar' }, { status: 500 })
    }

    const comment: CommentResponse = {
      id: inserted.id,
      author: inserted.author_name,
      authorId: inserted.author_id,
      content: inserted.content,
      timestamp: inserted.created_at,
      likes: 0,
      isLiked: false,
      replies: [],
    }

    return NextResponse.json({ comment })
  } catch (e) {
    console.error('POST recipe comment error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
