import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getBlogSeoCategoryProfile } from '@/lib/blog-seo-category-profiles'
import { injectInternalLinkIntoSection } from '@/lib/blog-internal-links'

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

type BlogSeoBrief = {
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

type SectionPayload = {
  section_type: 'introduction' | 'content' | 'conclusion'
  title?: string
  content: string
  takeaway?: string
  section_order?: number
}

type RegenerateSectionRequest = {
  categoryId: number
  postType?: 'core' | 'blog'
  blogTitle: string
  suggestion?: TopicSuggestion | null
  brief?: BlogSeoBrief | null
  targetSection: SectionPayload
  allSections: SectionPayload[]
}

export async function POST(request: NextRequest) {
  try {
    const {
      categoryId,
      postType = 'blog',
      blogTitle,
      suggestion,
      brief,
      targetSection,
      allSections,
    }: RegenerateSectionRequest = await request.json()

    if (!categoryId || !blogTitle || !targetSection?.section_type) {
      return NextResponse.json(
        { success: false, error: 'categoryId, blogTitle and targetSection are required' },
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

    const profile = getBlogSeoCategoryProfile(category.slug || category.name)

    const sectionOverview = (allSections || [])
      .map((section, index) => {
        const title =
          section.section_type === 'content'
            ? section.title || `Sektion ${index + 1}`
            : section.section_type === 'introduction'
              ? 'Indledning'
              : 'Afslutning'

        return `- ${title} (${section.section_type})`
      })
      .join('\n')

    const systemPrompt = `Du er senior dansk SEO-redaktør og health content strategist for Functional Foods.

Du skal regenerere præcis én sektion i en eksisterende artikel.

Svar KUN som JSON i dette format:
{
  "title": "string",
  "content": "string",
  "takeaway": "string"
}

Krav:
- Skriv på dansk.
- Hold samme artikelvinkel og kategori.
- Undgå overlap med de andre sektioner.
- Skriv naturligt og konkret, ikke AI-agtigt.
- Hvis der findes interne links i briefet, må du gerne flette maks. ét relevant markdown-link ind i sektionen i formatet [ankertekst](/blog/kategori/slug).
- Intro og afslutning må ikke få kunstige overskrifter i content-feltet.
- Giv teksten lidt mere personlighed og varme, men stadig professionel og fagligt troværdig.
- Brug gerne en kort, genkendelig hverdagsobservation eller mikro-anekdote, hvis det passer naturligt til sektionen.
- Undgå at lyde som en generisk ekspert eller en AI-skabelon.
- Emojis er tilladt meget sparsomt: højst 1 lille, relevant emoji i sektionen og kun hvis det føles naturligt.
- Standard er flydende prosa. Brug kun bullets, hvis det er klart mere brugbart end almindelige afsnit.
- Undgå skoleagtige formuleringer som "Praktiske tips:", "Evidensbaseret fordel:" eller "Kort fortalt:".
- Flet faglighed naturligt ind i teksten i stedet for at opstille den som punktvis undervisning.
- \`takeaway\` skal gerne være tom streng, medmindre der opstår en virkelig skarp afsluttende pointe.`

    const userPrompt = `Artikel:
- Titel: ${blogTitle}
- Kategori: ${category.name}
- Kategori-slug: ${category.slug}
- Post type: ${postType}
- Beskrivelse: ${category.description || 'ikke angivet'}

Kategori-profil:
- Audience: ${profile.audience}
- Positioning: ${profile.positioning}
- Core topics: ${profile.coreTopics.join(', ')}
- Search intents: ${profile.searchIntents.join(', ')}
- Avoid: ${profile.avoid.join(', ')}
- Tone: ${profile.toneGuidelines.join(', ')}
- Angles: ${profile.contentAngles.join(', ')}

Emneidé:
- Titel: ${suggestion?.title || blogTitle}
- Primary keyword: ${brief?.primaryKeyword || suggestion?.primaryKeyword || 'ikke angivet'}
- Search intent: ${brief?.searchIntent || suggestion?.searchIntent || 'ikke angivet'}
- Angle: ${brief?.angle || suggestion?.suggestedAngle || 'ikke angivet'}
- Reader promise: ${brief?.readerPromise || 'ikke angivet'}

Brief:
- Secondary keywords: ${(brief?.secondaryKeywords || []).join(', ')}
- Section plan:
${(brief?.sectionPlan || []).map((item) => `  - ${item}`).join('\n') || '  - ingen'}
- Internal links:
${(brief?.internalLinks || [])
  .map((item) => `  - [${item.title}](/blog/${category.slug}/${item.slug}) - ${item.reason}`)
  .join('\n') || '  - ingen'}
- Notes:
${(brief?.notes || []).map((item) => `  - ${item}`).join('\n') || '  - ingen'}

Artiklens nuværende struktur:
${sectionOverview || '- Ingen sektioner'}

Sektionen der skal regenereres:
- Type: ${targetSection.section_type}
- Titel: ${targetSection.title || 'ikke angivet'}
- Nuværende content:
${targetSection.content || 'tom'}
- Nuværende takeaway: ${targetSection.takeaway || 'ingen'}

Skriv nu en forbedret version af netop denne sektion, så den passer ind i resten af artiklen, lyder mere menneskelig og stadig er konkret og brugbar. Undgå især den klassiske AI-struktur med forklaring efterfulgt af punktliste og skoleagtig opsummering.`

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
        max_tokens: 1600,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    const normalizedSection = injectInternalLinkIntoSection(
      {
        section_type: targetSection.section_type,
        title:
          targetSection.section_type === 'content'
            ? String(parsed.title || targetSection.title || '').trim()
            : targetSection.title || '',
        content: String(parsed.content || '').trim(),
        takeaway: String(parsed.takeaway || '').trim(),
      },
      brief?.internalLinks,
      category.slug
    )

    return NextResponse.json({
      success: true,
      section: normalizedSection,
    })
  } catch (error) {
    console.error('Error regenerating blog section:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to regenerate section',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

