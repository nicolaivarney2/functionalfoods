import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type BlogSectionInput = {
  section_type?: string
  section_order?: number
  title?: string | null
  heading?: string | null
  content?: string | null
  image_url?: string | null
  widget_id?: number | null
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function sanitizeSection(section: BlogSectionInput, index: number, blogPostId: number) {
  const sectionType = ['introduction', 'content', 'widget', 'conclusion'].includes(section.section_type || '')
    ? section.section_type
    : 'content'

  return {
    blog_post_id: blogPostId,
    section_type: sectionType,
    section_order: Number.isFinite(section.section_order) ? section.section_order : index + 1,
    title: section.title || section.heading || null,
    content: (section.content || '').replace(/\r\n/g, '\n'),
    image_url: section.image_url || null,
    widget_id: section.widget_id || null,
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const blogPostId = Number(id)
    if (!Number.isFinite(blogPostId)) {
      return NextResponse.json({ error: 'Invalid blog post id' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingPost, error: postError } = await supabase
      .from('blog_posts')
      .select('author_id')
      .eq('id', blogPostId)
      .single()

    if (postError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

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

    const body = await request.json()
    const sections = Array.isArray(body?.sections) ? body.sections : []
    const sectionsToInsert = sections.map((section: BlogSectionInput, index: number) =>
      sanitizeSection(section, index, blogPostId)
    )

    const { error: deleteError } = await supabase
      .from('blog_content_sections')
      .delete()
      .eq('blog_post_id', blogPostId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete existing sections', details: deleteError.message },
        { status: 500 }
      )
    }

    if (sectionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('blog_content_sections')
        .insert(sectionsToInsert)

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to save sections', details: insertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving blog sections:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
