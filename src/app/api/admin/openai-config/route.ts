import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig, saveOpenAIConfig } from '@/lib/openai-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const config = getOpenAIConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        message: 'Ingen OpenAI config fundet',
        apiKey: '',
        assistantIds: {
          familiemad: '',
          keto: '',
          sense: '',
          paleo: '',
          antiinflammatorisk: '',
          fleksitarisk: '',
          '5-2': '',
          'proteinrig-kost': ''
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      apiKey: config.apiKey,
      assistantIds: config.assistantIds || {
        familiemad: '',
        keto: '',
        sense: '',
        paleo: '',
        antiinflammatorisk: '',
        fleksitarisk: '',
        '5-2': '',
        'meal-prep': ''
      }
    })

  } catch (error: any) {
    console.error('Error getting OpenAI config:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, assistantIds } = body

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'API nøgle er påkrævet' 
      }, { status: 400 })
    }

    const success = saveOpenAIConfig({ 
      apiKey, 
      assistantIds: assistantIds || {}
    })

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'OpenAI config gemt succesfuldt' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Kunne ikke gemme config' 
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Error saving OpenAI config:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Unknown error' 
    }, { status: 500 })
  }
}

