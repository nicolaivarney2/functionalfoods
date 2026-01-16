import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'

interface GenerateBlogResumeRequest {
  title: string
  category: string
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { title, category, content }: GenerateBlogResumeRequest = await request.json()
    
    if (!title || !category || !content) {
      return NextResponse.json(
        { success: false, error: 'Title, category, and content are required' },
        { status: 400 }
      )
    }

    console.log(`📋 Generating resume for: ${title} (${category})`)

    // Get OpenAI config from existing system
    const openaiConfig = getOpenAIConfig()
    
    if (!openaiConfig || !openaiConfig.apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured',
          details: 'Please configure OpenAI API key in admin settings'
        },
        { status: 500 }
      )
    }

    // Create system prompt for resume generation
    const systemPrompt = createResumeSystemPrompt(category)
    
    // Create user prompt
    const userPrompt = `Baseret på følgende blog indhold om "${title}" inden for ${category}, lav en kort og præcis resume/opsummering:

${content}

Lav en resume der:
1. Opsummerer de vigtigste pointer i 4-6 bullet points
2. Fokuserer på de mest praktiske og vigtige informationer
3. Er skrevet på dansk
4. Er let at læse og forstå
5. Giver læseren et hurtigt overblik over indholdet

Formatér det som en liste med bullet points, hvor hver point er kort og præcis.`
    
    // Generate resume with OpenAI using existing config
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 800
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const completion = await response.json()
    const generatedResume = completion.choices[0]?.message?.content
    
    if (!generatedResume) {
      throw new Error('No resume generated')
    }

    console.log(`✅ Generated resume for: ${title}`)

    return NextResponse.json({
      success: true,
      resume: generatedResume.trim()
    })

  } catch (error) {
    console.error('Error generating blog resume:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate blog resume',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createResumeSystemPrompt(category: string): string {
  const basePrompt = `Du er en ekspert inden for sundhed, ernæring og vægttab. Du skriver på dansk og fokuserer på at lave præcise, hjælpsomme opsummeringer.

Din rolle er at lave korte, præcise resume'er der hjælper danske brugere med hurtigt at forstå de vigtigste pointer fra blog artikler.`

  const categorySpecificPrompts: { [key: string]: string } = {
    'Keto': `Du er særligt ekspert i ketogen diæt. Fokuser på:
- Praktiske keto tips og råd
- Vigtige keto principper
- Fødevarer og ingredienser
- Sundhedsfordele og overvejelser`,
    
    'LCHF': `Du er ekspert i lav-kulhydrat, høj-fedt ernæring. Fokuser på:
- LCHF principper og implementering
- Praktiske råd til LCHF livsstil
- Fedttyper og sundhed`,
    
    'Paleo': `Du er ekspert i paleo livsstil. Fokuser på:
- Paleo principper og naturlige ingredienser
- Praktiske paleo råd
- Historisk ernæring og moderne tilpasning`,
    
    'Sense': `Du er ekspert i hjerne-sundhed. Fokuser på:
- Næringsstoffer der støtter hjernefunktion
- Praktiske råd til bedre koncentration
- Anti-inflammatorisk ernæring`,
    
    'Anti-inflammatorisk': `Du er ekspert i anti-inflammatorisk ernæring. Fokuser på:
- Inflammationsreducerende fødevarer
- Praktiske råd til at reducere inflammation
- Antioxidanter og deres rolle`,
    
    'Fleksitarisk': `Du er ekspert i fleksitarisk livsstil. Fokuser på:
- Balance mellem plantebaseret og animalsk kost
- Praktiske råd til at reducere kødforbrug
- Plantebaserede alternativer`,
    
    '5:2 Diæt': `Du er ekspert i intermittent fasting. Fokuser på:
- 5:2 principper og implementering
- Praktiske råd til faste-dage
- Sundhedsfordele og overvejelser`,
    
    'Proteinrig kost': `Du er ekspert i proteinrig kost. Fokuser på:
- Optimal proteinindtag for sundhed og vægttab
- Praktiske råd til proteinrige måltider
- Opbevaring og holdbarhed`,
    
    'Familiemad': `Du er ekspert i sund familieernæring. Fokuser på:
- Sunde opskrifter hele familien kan lide
- Praktiske råd til børn og sund mad
- Budget-venlige familieopskrifter`
  }

  const categoryPrompt = categorySpecificPrompts[category] || categorySpecificPrompts['Keto']
  
  return `${basePrompt}

${categoryPrompt}

Vigtige retningslinjer for resume:
- Skriv altid på dansk
- Hold hver bullet point kort og præcis (1-2 linjer)
- Fokuser på de mest praktiske og vigtige informationer
- Brug en venlig, professionel tone
- Undgå gentagelser
- Prioriter information der hjælper læseren hurtigt at forstå hovedpointerne`
}
