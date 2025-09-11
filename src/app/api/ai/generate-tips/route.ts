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

    // Kald OpenAI Assistant API
    const tips = await callOpenAIAssistant(prompt)

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

async function callOpenAIAssistant(prompt: string): Promise<string> {
  // Læs OpenAI config fra fil
  const config = getOpenAIConfig()
  
  if (!config || !config.apiKey) {
    throw new Error('OpenAI API key mangler. Tilføj den i /admin/settings')
  }

  try {
    console.log('🤖 Starter OpenAI Assistant kald...')
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...')
    
    // Trin 1: Opret en thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!threadResponse.ok) {
      const errorData = await threadResponse.text()
      console.error('❌ Thread creation failed:', threadResponse.status, errorData)
      throw new Error(`Kunne ikke oprette thread: ${threadResponse.status} - ${errorData}`)
    }

    const thread = await threadResponse.json()
    const threadId = thread.id
    console.log('✅ Thread oprettet:', threadId)

    // Trin 2: Tilføj besked til thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: prompt
      })
    })

    if (!messageResponse.ok) {
      const errorData = await messageResponse.text()
      console.error('❌ Message creation failed:', messageResponse.status, errorData)
      throw new Error(`Kunne ikke tilføje besked: ${messageResponse.status}`)
    }

    console.log('✅ Besked tilføjet til thread')

    // Trin 3: Start assistant run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: config.assistantIds?.familiemad || 'asst_default'
      })
    })

    if (!runResponse.ok) {
      const errorData = await runResponse.text()
      console.error('❌ Run creation failed:', runResponse.status, errorData)
      throw new Error(`Kunne ikke starte assistant: ${runResponse.status}`)
    }

    const run = await runResponse.json()
    const runId = run.id
    console.log('✅ Assistant run startet:', runId)

    // Trin 4: Vent på completion (polling)
    let completed = false
    let attempts = 0
    const maxAttempts = 30

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Vent 1 sekund
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (!statusResponse.ok) {
        throw new Error('Kunne ikke tjekke status')
      }

      const status = await statusResponse.json()
      console.log(`🔄 Run status: ${status.status} (forsøg ${attempts + 1})`)
      
      if (status.status === 'completed') {
        completed = true
      } else if (status.status === 'failed') {
        throw new Error('Assistant fejlede')
      } else if (status.status === 'expired') {
        throw new Error('Assistant udløb')
      }

      attempts++
    }

    if (!completed) {
      throw new Error('Assistant tog for lang tid')
    }

    // Trin 5: Hent svaret
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!messagesResponse.ok) {
      throw new Error('Kunne ikke hente svar')
    }

    const messages = await messagesResponse.json()
    const lastMessage = messages.data[0] // Seneste besked (assistant's svar)
    
    console.log('✅ Assistant svar modtaget')
    return lastMessage.content[0].text.value

  } catch (error: any) {
    console.error('OpenAI API error:', error)
    // Fallback til template hvis API fejler
    return generatePersonalTipsFallback()
  }
}

function generatePersonalTipsFallback(): string {
  return `Denne ret har jeg lavet mange gange, og den bliver bedre hver gang!

Min bedste tip er at tage dig tid til at forberede alle ingredienserne først.

Jeg plejer at servere den med en frisk salat til - det giver en perfekt balance.

Lad retten hvile i 5 minutter efter den er færdig, så udvikler alle smagene sig perfekt.`
}