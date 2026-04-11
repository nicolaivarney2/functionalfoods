import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getBlogSeoCategoryProfile } from '@/lib/blog-seo-category-profiles'

type SuggestTopicRequest = {
  categoryId: number
  postType?: 'core' | 'blog'
  limit?: number
}

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

export async function POST(request: NextRequest) {
  try {
    const { categoryId, postType = 'blog', limit = 8 }: SuggestTopicRequest = await request.json()

    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'categoryId is required' }, { status: 400 })
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
      return NextResponse.json(
        { success: false, error: 'Blog category not found' },
        { status: 404 }
      )
    }

    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('title, slug, tags, status, post_type')
      .eq('category_id', categoryId)
      .eq('post_type', postType)
      .order('created_at', { ascending: false })

    if (postsError) {
      throw postsError
    }

    const existingTitles = (posts || []).map((post) => String(post.title || '').trim()).filter(Boolean)
    const existingTags = Array.from(
      new Set(
        (posts || [])
          .flatMap((post) => (Array.isArray(post.tags) ? post.tags : []))
          .map((tag) => String(tag || '').trim())
          .filter(Boolean)
      )
    )

    const profile = getBlogSeoCategoryProfile(category.slug || category.name)

    const systemPrompt = `Du er en senior dansk SEO content strategist for Functional Foods.

Du skal foreslå blog-emner, der:
- passer stramt til den valgte kategori
- udfylder reelle content gaps ift. eksisterende titler
- har tydelig search intent
- kan omsættes til troværdigt, menneskeligt indhold i en sektion-baseret editor
- ikke virker AI-genererede eller generiske

Svar KUN som JSON i formatet:
{
  "suggestions": [
    {
      "title": "string",
      "primaryKeyword": "string",
      "searchIntent": "informational|commercial investigation|problem solving|beginner guide|comparison",
      "whyNow": "string",
      "gapReason": "string",
      "suggestedAngle": "string",
      "suggestedExcerpt": "string",
      "suggestedMetaTitle": "string",
      "suggestedMetaDescription": "string",
      "suggestedTags": ["string"],
      "suggestedOutline": ["string", "string", "string"],
      "priority": "high|medium|low"
    }
  ]
}

Krav:
- Skriv på dansk.
- Maks ${Math.min(Math.max(limit, 4), 12)} forslag.
- Titler skal være forskellige fra eksisterende titler og må ikke være lette omskrivninger af dem.
- Fokus på emner der realistisk kan skabe SEO-værdi og hjælpe brugeren.
- Hvis kategorien er "Proteinrig kost", må træning være relevant, men kun koblet tydeligt til kost og måltider.
- Brug kategoriens profil aktivt.`

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

Eksisterende titler i kategorien (${existingTitles.length}):
${existingTitles.length > 0 ? existingTitles.map((title) => `- ${title}`).join('\n') : '- Ingen endnu'}

Eksisterende tags:
${existingTags.length > 0 ? existingTags.map((tag) => `- ${tag}`).join('\n') : '- Ingen endnu'}

Opgave:
1. Find de bedste content gaps i kategorien.
2. Foreslå emner vi mangler eller klart bør skrive om.
3. Sørg for variation: begynderguide, konkrete problemer, how-to, lister eller fejl/FAQ hvor det giver mening.
4. Giv hver idé en outline som passer til sektioner/bokse i editoren.`

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
        temperature: 0.5,
        max_tokens: 2200,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []

    return NextResponse.json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      existingTitleCount: existingTitles.length,
      suggestions: suggestions.slice(0, Math.min(Math.max(limit, 4), 12)) as TopicSuggestion[],
    })
  } catch (error) {
    console.error('Error suggesting blog topics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to suggest blog topics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

