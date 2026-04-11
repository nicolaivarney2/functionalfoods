import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'

interface GenerateBlogContentRequest {
  title: string
  category: string
  existingContent: string
}

export async function POST(request: NextRequest) {
  try {
    const { title, category, existingContent }: GenerateBlogContentRequest = await request.json()
    
    if (!title || !category) {
      return NextResponse.json(
        { success: false, error: 'Title and category are required' },
        { status: 400 }
      )
    }

    console.log(`🤖 Generating blog content for: ${title} (${category})`)

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

    // Create system prompt for blog content generation
    const systemPrompt = createBlogSystemPrompt(category)
    
    // Create user prompt with existing content context
    const userPrompt = `Ud fra bedst practise inden for vægttab og "${category}", skal du vurdere og skrive et afsnit til blog der har titlen: "${title}". 

Skriv et afsnit der mangler i bloggen, for at den hjælper brugeren endnu mere forstå konceptet. Her er hvad vi allerede har skrevet:

${existingContent}

Generer et nyt afsnit med:
1. En relevant overskrift
2. Velstruktureret indhold der supplerer det eksisterende
3. Praktiske tips og råd
4. Evidensbaseret information hvor relevant
5. En lidt mere menneskelig, varm og mindre stiv tone
6. Gerne en lille genkendelig hverdagssituation eller mikro-anekdote, hvis det passer naturligt
7. Primært flydende brødtekst i stedet for punktlisteundervisning

Svar i følgende format:
OVERSKRIFT: [din overskrift]
INHOLD: [dit indhold]

Hold det dansk og fokuser på praktisk anvendelse. Emojis er tilladt meget sparsomt, højst 1 lille og kun hvis den føles naturlig. Undgå labels som "Praktiske tips:" og "Evidensbaseret fordel:". Brug kun bullets hvis de er klart bedre end almindelige afsnit.`
    
    // Generate content with OpenAI using existing config
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
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const completion = await response.json()
    const generatedContent = completion.choices[0]?.message?.content
    
    if (!generatedContent) {
      throw new Error('No content generated')
    }

    // Parse the generated content
    const parsedContent = parseGeneratedContent(generatedContent)
    
    console.log(`✅ Generated blog content: ${parsedContent.heading}`)

    return NextResponse.json({
      success: true,
      content: parsedContent.content,
      heading: parsedContent.heading
    })

  } catch (error) {
    console.error('Error generating blog content:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate blog content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createBlogSystemPrompt(category: string): string {
  const basePrompt = `Du er en ekspert inden for sundhed, ernæring og vægttab. Du skriver på dansk og fokuserer på evidensbaseret information og praktiske råd.

Din rolle er at skrive informative, engagerende og hjælpsomme blogafsnit der hjælper danske brugere med deres sundheds- og vægttabsmål.

Teksten må gerne have lidt personlighed og varme. Den skal føles skrevet af et menneske, ikke af en skabelon. Brug gerne små hverdagsnære observationer, men hold tonen professionel og troværdig.`

  const categorySpecificPrompts: { [key: string]: string } = {
    'Keto': `Du er særligt ekspert i ketogen diæt og lav-kulhydrat ernæring. Fokuser på:
- Keto-venlige ingredienser og opskrifter
- Ketose og metabolisme
- Praktiske tips til at holde sig i ketose
- Danske keto-produkter og alternativer
- Evidens for keto diætens effekt på vægttab og sundhed`,
    
    'LCHF': `Du er ekspert i lav-kulhydrat, høj-fedt (LCHF) ernæring. Fokuser på:
- LCHF principper og implementering
- Fedttyper og deres sundhedsmæssige effekter
- Praktiske råd til LCHF livsstil
- Danske LCHF-produkter og alternativer`,
    
    'Paleo': `Du er ekspert i paleo livsstil og ernæring. Fokuser på:
- Paleo principper og historisk ernæring
- Naturlige ingredienser og undgåelse af processerede fødevarer
- Praktiske paleo opskrifter og råd
- Danske paleo-venlige produkter`,
    
    'Sense': `Du er ekspert i hjerne-sundhed og kognitiv optimering gennem ernæring. Fokuser på:
- Næringsstoffer der støtter hjernefunktion
- Anti-inflammatorisk ernæring
- Omega-3 fedtsyrer og hjerne-sundhed
- Praktiske råd til bedre koncentration og hukommelse`,
    
    'Anti-inflammatorisk': `Du er ekspert i anti-inflammatorisk ernæring. Fokuser på:
- Inflammationsfremkaldende og -reducerende fødevarer
- Antioxidanter og deres rolle
- Praktiske råd til at reducere inflammation gennem kost
- Danske anti-inflammatoriske ingredienser`,
    
    'Fleksitarisk': `Du er ekspert i fleksitarisk livsstil. Fokuser på:
- Balance mellem plantebaseret og animalsk kost
- Praktiske råd til at reducere kødforbrug
- Plantebaserede proteiner og næringsstoffer
- Danske fleksitariske alternativer`,
    
    '5:2 Diæt': `Du er ekspert i intermittent fasting og 5:2 diæt. Fokuser på:
- 5:2 principper og implementering
- Faste-dage og spisedage
- Praktiske råd til at håndtere sult
- Danske 5:2-venlige opskrifter`,
    
    'Proteinrig kost': `Du er ekspert i proteinrig kost og optimal næring. Fokuser på:
- Effektive strategier for højt proteinindtag
- Opbevaring og holdbarhed
- Praktiske råd til at spare tid og penge
- Danske proteinrige opskrifter`,
    
    'Familiemad': `Du er ekspert i sund familieernæring. Fokuser på:
- Sunde opskrifter hele familien kan lide
- Praktiske råd til at få børn til at spise sundt
- Budget-venlige familieopskrifter
- Danske familiemad traditioner og moderne tilpasninger`
  }

  const categoryPrompt = categorySpecificPrompts[category] || categorySpecificPrompts['Keto']
  
  return `${basePrompt}

${categoryPrompt}

Vigtige retningslinjer:
- Skriv altid på dansk
- Brug evidensbaseret information
- Fokuser på praktisk anvendelse
- Vær engagerende og let at forstå
- Inkluder konkrete tips og råd
- Undgå at gentage information fra eksisterende indhold
- Skriv i en venlig, professionel tone
- Undgå stive, formelle standardsætninger og AI-agtige formuleringer
- Emojis er tilladt meget sparsomt: højst 1 lille, relevant emoji hvis det passer naturligt
- Standard er sammenhængende prosa, ikke punktvis undervisning
- Undgå skoleagtige labels og kunstig opsummeringstonе`
}

function parseGeneratedContent(content: string): { heading: string, content: string } {
  // Try to parse the structured format first
  const headingMatch = content.match(/OVERSKRIFT:\s*(.+)/i)
  const contentMatch = content.match(/INHOLD:\s*([\s\S]+)/i)
  
  if (headingMatch && contentMatch) {
    return {
      heading: headingMatch[1].trim(),
      content: contentMatch[1].trim()
    }
  }
  
  // Fallback: try to extract heading from first line or create one
  const lines = content.split('\n').filter(line => line.trim())
  const firstLine = lines[0]?.trim()
  
  // If first line looks like a heading (short, no period, etc.)
  if (firstLine && firstLine.length < 100 && !firstLine.endsWith('.')) {
    return {
      heading: firstLine,
      content: lines.slice(1).join('\n').trim()
    }
  }
  
  // Default fallback
  return {
    heading: 'Nyt Afsnit',
    content: content.trim()
  }
}
