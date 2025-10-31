import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET - Hent specifik blog post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching blog post:', error)
      return NextResponse.json(
        { error: 'Blog post not found', details: error.message },
        { status: 404 }
      )
    }

    // Increment view count for published posts
    if (data.status === 'published') {
      await supabase
        .from('blog_posts')
        .update({ view_count: data.view_count + 1 })
        .eq('id', id)
    }

    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Opdater blog post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updateData = await request.json()

    // Check if user is admin or author of the post
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('author_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isAuthor = existingPost.author_id === user.id

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Handle status change to published
    if (updateData.status === 'published' && !updateData.published_at) {
      updateData.published_at = new Date().toISOString()
    }

    // Update blog post
    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        category:blog_categories(*)
      `)
      .single()

    if (error) {
      console.error('Error updating blog post:', error)
      return NextResponse.json(
        { error: 'Failed to update blog post', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('Error in PUT /api/blogs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Slet blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or author of the post
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('author_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isAuthor = existingPost.author_id === user.id

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete blog post
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting blog post:', error)
      return NextResponse.json(
        { error: 'Failed to delete blog post', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/blogs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
