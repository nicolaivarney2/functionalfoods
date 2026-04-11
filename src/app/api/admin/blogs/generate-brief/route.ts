import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getBlogSeoCategoryProfile } from '@/lib/blog-seo-category-profiles'

type TopicSuggestion = {
  title: string
  primaryKeyword: string
  searchIntent: string
  whyNow: string
  gapReason: string
  suggestedAngle: string
  suggestedExcerpt: string
  suggestedMetaTitle: string
  suggestedMetaDescription: string
  suggestedTags: string[]
  suggestedOutline: string[]
  priority: 'high' | 'medium' | 'low'
}

type GenerateBriefRequest = {
  categoryId: number
  postType?: 'core' | 'blog'
  suggestion: TopicSuggestion
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, postType = 'blog', suggestion }: GenerateBriefRequest = await request.json()

    if (!categoryId || !suggestion?.title) {
      return NextResponse.json(
        { success: false, error: 'categoryId and suggestion are required' },
        { status: 400 }
      )
    }

    const openaiConfig = getOpenAIConfig()
    if (!openaiConfig?.apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const supabase = createSupabaseServiceClient()

    const { data: category, error: categoryError } = await supabase
      .from('blog_categories')
      .select('id, name, slug, description')
      .eq('id', categoryId)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ success: false, error: 'Blog category not found' }, { status: 404 })
    }

    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('title, slug, excerpt, tags, post_type, status')
      .eq('category_id', categoryId)
      .eq('post_type', postType)
      .order('created_at', { ascending: false })
      .limit(60)

    if (postsError) throw postsError

    const profile = getBlogSeoCategoryProfile(category.slug || category.name)
    const existingTitles = (posts || []).map((post) => String(post.title || '').trim()).filter(Boolean)
    const publishedPosts = (posts || []).filter((post) => post.status === 'published')

    const systemPrompt = `Du er senior dansk SEO-strateg og redaktør for Functional Foods.

Du skal lave et kort, handlingsklart SEO brief for en blogidé.

Svar KUN som JSON i dette format:
{
  "recommendedTitle": "string",
  "recommendedSlug": "string",
  "searchIntent": "string",
  "primaryKeyword": "string",
  "secondaryKeywords": ["string"],
  "readerPromise": "string",
  "angle": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "recommendedTags": ["string"],
  "sectionPlan": ["string"],
  "internalLinks": [
    { "title": "string", "slug": "string", "reason": "string" }
  ],
  "notes": ["string"]
}

Krav:
- Dansk.
- Praktisk og konkret.
- Ingen fluffy SEO-jargon.
- Internal links må kun vælges fra de givne eksisterende posts.
- Sektionplan skal passe til en editor med flytbare bokse.`

    const userPrompt = `Kategori:
- Navn: ${category.name}
- Slug: ${category.slug}
- Beskrivelse: ${category.description || 'ikke angivet'}
- Post type: ${postType}

Kategori-profil:
- Audience: ${profile.audience}
- Positioning: ${profile.positioning}
- Core topics: ${profile.coreTopics.join(', ')}
- Search intents: ${profile.searchIntents.join(', ')}
- Avoid: ${profile.avoid.join(', ')}
- Tone: ${profile.toneGuidelines.join(', ')}
- Angles: ${profile.contentAngles.join(', ')}

Valgt emne:
- Titel: ${suggestion.title}
- Primært keyword: ${suggestion.primaryKeyword}
- Search intent: ${suggestion.searchIntent}
- Hvorfor nu: ${suggestion.whyNow}
- Gap reason: ${suggestion.gapReason}
- Suggested angle: ${suggestion.suggestedAngle}
- Suggested excerpt: ${suggestion.suggestedExcerpt}
- Suggested meta title: ${suggestion.suggestedMetaTitle}
- Suggested meta description: ${suggestion.suggestedMetaDescription}
- Suggested tags: ${(suggestion.suggestedTags || []).join(', ')}
- Suggested outline:
${(suggestion.suggestedOutline || []).map((item) => `  - ${item}`).join('\n')}

Eksisterende titler i kategorien:
${existingTitles.length > 0 ? existingTitles.map((title) => `- ${title}`).join('\n') : '- Ingen endnu'}

Mulige interne links (må kun vælges herfra):
${publishedPosts.length > 0
  ? publishedPosts.map((post) => `- ${post.title} | slug: ${post.slug}`).join('\n')
  : '- Ingen publicerede posts endnu'}

Lav nu et skarpt brief, der hjælper en redaktør med hurtigt at vurdere og skrive artiklen.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 2200,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const brief = JSON.parse(content)

    return NextResponse.json({
      success: true,
      brief,
    })
  } catch (error) {
    console.error('Error generating blog brief:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate blog brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

