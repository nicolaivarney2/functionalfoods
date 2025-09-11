import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhookUrl } = body

    if (!webhookUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Webhook URL er påkrævet' 
      }, { status: 400 })
    }

    console.log(`🧪 Testing Midjourney webhook: ${webhookUrl}`)

    // Test webhook with sample data
    const testData = {
      recipe: {
        title: "Test Opskrift",
        description: "Dette er en test for at verificere webhook funktionalitet",
        category: "Test",
        dietaryCategories: ["test"]
      },
      imagePrompt: "Professional food photography test image, simple clean presentation, white background",
      timestamp: new Date().toISOString(),
      test: true
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    if (response.ok) {
      const responseData = await response.text()
      console.log(`✅ Webhook test successful: ${response.status}`)
      
      return NextResponse.json({
        success: true,
        message: `Webhook test succesfuld! Status: ${response.status}`,
        response: responseData.substring(0, 200) + (responseData.length > 200 ? '...' : '')
      })
    } else {
      console.error(`❌ Webhook test failed: ${response.status}`)
      
      return NextResponse.json({
        success: false,
        error: `Webhook test fejlede med status: ${response.status}`,
        details: await response.text()
      }, { status: response.status })
    }

  } catch (error: any) {
    console.error('Error testing webhook:', error)
    return NextResponse.json({
      success: false,
      error: 'Fejl ved test af webhook',
      details: error.message
    }, { status: 500 })
  }
}
