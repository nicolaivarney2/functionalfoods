import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface GenerateTipsRequest {
  title: string
  description: string
  difficulty: string
  totalTime: number
  dietaryCategories: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateTipsRequest = await request.json()
    const { title, description, difficulty, totalTime, dietaryCategories } = body

    // Prompt til at generere menneskelige, personlige tips
    const prompt = `Generer personlige tips til denne opskrift:

Opskrift: ${title}
Beskrivelse: ${description}
Sværhedsgrad: ${difficulty}
Total tid: ${totalTime} minutter
Kategori: ${dietaryCategories.join(', ') || 'Generel'}

Skriv 3-4 personlige, menneskelige tips som om du har lavet denne ret mange gange.`

    // Kald OpenAI standard API
    const tipsJson = await callOpenAIStandardAPI(prompt)
    
    // Parse JSON response
    let tips
    try {
      const parsed = JSON.parse(tipsJson)
      tips = parsed.tips ? parsed.tips.join('\n\n') : tipsJson
    } catch (error) {
      console.error('Failed to parse AI tips JSON:', error)
      tips = tipsJson // Fallback to raw response
    }

    return NextResponse.json({ 
      success: true, 
      tips,
      message: 'AI tips genereret succesfuldt'
    })

  } catch (error: any) {
    console.error('Error generating AI tips:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Unknown error' 
    }, { status: 500 })
  }
}

async function callOpenAIStandardAPI(prompt: string): Promise<string> {
  // Læs OpenAI config fra fil
  const config = getOpenAIConfig()
  
  if (!config || !config.apiKey) {
    throw new Error('OpenAI API key mangler. Tilføj den i /admin/settings')
  }

  try {
    console.log('🤖 Starter OpenAI standard API kald...')
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Du er en erfaren kok der skal give personlige tips til opskrifter. Skriv altid på dansk.

Returnér kun valid JSON i dette format:
{
  "tips": [
    "Tip 1 her",
    "Tip 2 her", 
    "Tip 3 her",
    "Tip 4 her"
  ]
}

Skriv 3-4 personlige, menneskelige tips som om du har lavet denne ret mange gange.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('No content generated')
    }

    console.log('✅ OpenAI svar modtaget')
    return content

  } catch (error: any) {
    console.error('OpenAI API error:', error)
    // Fallback til template hvis API fejler
    return generatePersonalTipsFallback()
  }
}

function generatePersonalTipsFallback(): string {
  return `{
  "tips": [
    "Denne ret har jeg lavet mange gange, og den bliver bedre hver gang!",
    "Min bedste tip er at tage dig tid til at forberede alle ingredienserne først.",
    "Jeg plejer at servere den med en frisk salat til - det giver en perfekt balance.",
    "Lad retten hvile i 5 minutter efter den er færdig, så udvikler alle smagene sig perfekt."
  ]
}`
}