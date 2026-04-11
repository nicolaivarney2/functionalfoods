import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getBlogSeoCategoryProfile } from '@/lib/blog-seo-category-profiles'
import { injectInternalLinksIntoSections } from '@/lib/blog-internal-links'

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

type GenerateStructuredPostRequest = {
  categoryId: number
  postType?: 'core' | 'blog'
  suggestion: TopicSuggestion
  brief?: {
    recommendedTitle?: string
    recommendedSlug?: string
    searchIntent?: string
    primaryKeyword?: string
    secondaryKeywords?: string[]
    readerPromise?: string
    angle?: string
    metaTitle?: string
    metaDescription?: string
    recommendedTags?: string[]
    sectionPlan?: string[]
    internalLinks?: Array<{ title: string; slug: string; reason: string }>
    notes?: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, postType = 'blog', suggestion, brief }: GenerateStructuredPostRequest = await request.json()

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
      .select('title, slug, tags, excerpt, post_type')
      .eq('category_id', categoryId)
      .eq('post_type', postType)
      .order('created_at', { ascending: false })
      .limit(40)

    if (postsError) throw postsError

    const existingTitles = (posts || []).map((post) => String(post.title || '').trim()).filter(Boolean)
    const profile = getBlogSeoCategoryProfile(category.slug || category.name)

    const systemPrompt = `Du er senior dansk SEO-redaktør og health content strategist for Functional Foods.

Din opgave er at skrive en HEL blogstruktur, klar til en editor med flytbare bokse.
Du skal skrive naturligt, menneskeligt og nyttigt på dansk. Indholdet må ikke virke AI-genereret eller fyldt med floskler.

SVAR KUN SOM JSON i dette format:
{
  "title": "string",
  "excerpt": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "tags": ["string"],
  "sections": [
    {
      "section_type": "introduction|content|conclusion",
      "title": "string",
      "content": "string",
      "takeaway": "string"
    }
  ]
}

Krav:
- Skriv på dansk.
- Introen skal være kort, stærk og konkret.
- Hver content-sektion skal have en tydelig overskrift og substantielt indhold.
- Brug kun bullets, når de faktisk gør teksten lettere at bruge. Standard er flydende brødtekst.
- Afslutningen skal samle op og være handlingsorienteret.
- Meta title og meta description skal være SEO-venlige men menneskelige.
- Tags skal være relevante og ikke overdrevent mange (ca. 4-8).
- Indholdet skal holde sig stramt til kategorien.
- Undgå at genbruge eller næsten kopiere eksisterende titler.
- Hvis der findes interne links i briefet, så flet dem naturligt ind i relevante sektioner som markdown-links i formatet [ankertekst](/blog/kategori/slug).
- Tonen må gerne være varm, menneskelig og let personlig uden at blive privat.
- Brug gerne små hverdagsnære observationer eller mikro-anekdoter, fx "de fleste kender det med..." eller "på travle dage er det ofte her, det glipper".
- Undgå stiv ekspert-tone, tomme floskler og for mange standardsætninger som lyder AI-genererede.
- Emojis er tilladt meget sparsomt: højst 1 lille, relevant emoji i introen eller afslutningen, og kun hvis det føles naturligt.
- Brug aldrig emojis i meta title eller meta description.
- Undgå mekaniske labels i selve teksten som "Evidensbaseret fordel:", "Praktiske tips:" og lignende.
- Flet faglighed og evidens naturligt ind i sætningerne i stedet for at lave skoleagtige bokse.
- Variér sætningslængde og rytme, så teksten føles skrevet af en redaktør, ikke som en AI-skabelon.
- \`takeaway\` skal ofte være tom streng. Udfyld den kun, hvis sektionen virkelig fortjener en kort, skarp pointe.`

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

Emnevalg:
- Titel: ${suggestion.title}
- Primary keyword: ${suggestion.primaryKeyword}
- Search intent: ${suggestion.searchIntent}
- Why now: ${suggestion.whyNow}
- Gap reason: ${suggestion.gapReason}
- Suggested angle: ${suggestion.suggestedAngle}
- Suggested excerpt: ${suggestion.suggestedExcerpt}
- Suggested meta title: ${suggestion.suggestedMetaTitle}
- Suggested meta description: ${suggestion.suggestedMetaDescription}
- Suggested tags: ${(suggestion.suggestedTags || []).join(', ')}
- Outline:
${(suggestion.suggestedOutline || []).map((item) => `  - ${item}`).join('\n')}

SEO brief (brug dette aktivt hvis det findes):
- Recommended title: ${brief?.recommendedTitle || 'ikke angivet'}
- Search intent: ${brief?.searchIntent || 'ikke angivet'}
- Primary keyword: ${brief?.primaryKeyword || suggestion.primaryKeyword}
- Secondary keywords: ${(brief?.secondaryKeywords || []).join(', ')}
- Reader promise: ${brief?.readerPromise || 'ikke angivet'}
- Angle: ${brief?.angle || suggestion.suggestedAngle}
- Meta title: ${brief?.metaTitle || suggestion.suggestedMetaTitle}
- Meta description: ${brief?.metaDescription || suggestion.suggestedMetaDescription}
- Recommended tags: ${(brief?.recommendedTags || suggestion.suggestedTags || []).join(', ')}
- Section plan:
${(brief?.sectionPlan || suggestion.suggestedOutline || []).map((item) => `  - ${item}`).join('\n')}
- Internal links:
${(brief?.internalLinks || [])
  .map((item) => `  - ${item.title} (${item.slug}): ${item.reason}`)
  .join('\n') || '  - ingen'}
- Notes:
${(brief?.notes || []).map((item) => `  - ${item}`).join('\n') || '  - ingen'}

Eksisterende titler i kategorien:
${existingTitles.length > 0 ? existingTitles.map((title) => `- ${title}`).join('\n') : '- Ingen endnu'}

Skriv nu en fuld blog til editoren som:
1. starter med en stærk indledning
2. bruger outline som sektioner (du må forbedre overskrifterne)
3. holder en troværdig, ikke-for-robotagtig tone
4. giver konkrete råd, forklaringer og SEO-stærkt indhold
5. føles skrevet af et rigtigt menneske med faglig ballast
6. gerne må have små menneskelige formuleringer, korte genkendelige situationer og lidt varme
7. primært er skrevet i sammenhængende prosa og kun bruger lister meget selektivt
8. undgår standard-AI-opbygningen "forklaring -> liste -> evidens -> takeaway"
9. passer til Functional Foods' stil og kategori.`

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
        temperature: 0.6,
        max_tokens: 3500,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : []
    const normalizedSections = rawSections
      .filter((section: any) => section && typeof section.content === 'string')
      .map((section: any, index: number) => ({
        section_type:
          section.section_type === 'introduction' || section.section_type === 'conclusion'
            ? section.section_type
            : 'content',
        section_order: index + 1,
        title: typeof section.title === 'string' ? section.title : '',
        heading: typeof section.title === 'string' ? section.title : '',
        content: String(section.content || '').trim(),
        takeaway: typeof section.takeaway === 'string' ? section.takeaway : '',
      }))

    const sectionsWithInternalLinks = injectInternalLinksIntoSections(
      normalizedSections,
      brief?.internalLinks,
      category.slug
    )

    return NextResponse.json({
      success: true,
      post: {
        title: parsed.title || brief?.recommendedTitle || suggestion.title,
        excerpt: parsed.excerpt || suggestion.suggestedExcerpt || '',
        metaTitle:
          parsed.metaTitle ||
          brief?.metaTitle ||
          suggestion.suggestedMetaTitle ||
          brief?.recommendedTitle ||
          suggestion.title,
        metaDescription:
          parsed.metaDescription ||
          brief?.metaDescription ||
          suggestion.suggestedMetaDescription ||
          '',
        tags:
          Array.isArray(parsed.tags) && parsed.tags.length > 0
            ? parsed.tags
            : brief?.recommendedTags || suggestion.suggestedTags || [],
        sections: sectionsWithInternalLinks,
      },
    })
  } catch (error) {
    console.error('Error generating structured blog post:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate structured blog post',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

