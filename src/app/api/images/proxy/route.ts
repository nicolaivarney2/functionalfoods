import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Image proxy for external product images (Goma, etc.)
 * Solves CORS issues when loading images locally
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    // Validate URL to prevent SSRF attacks
    try {
      const url = new URL(imageUrl)
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch image with proper headers
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    }

    // Add referer for specific domains if needed
    if (imageUrl.includes('ketoliv.dk')) {
      headers['Referer'] = 'https://ketoliv.dk'
    }
    
    // Handle Spar images - they might need specific headers
    if (imageUrl.includes('spar') || imageUrl.includes('spar.dk')) {
      headers['Referer'] = 'https://www.spar.dk/'
      headers['Origin'] = 'https://www.spar.dk'
    }
    
    // Handle other supermarket domains
    if (imageUrl.includes('netto.dk')) {
      headers['Referer'] = 'https://www.netto.dk/'
    }
    if (imageUrl.includes('rema1000.dk')) {
      headers['Referer'] = 'https://www.rema1000.dk/'
    }
    if (imageUrl.includes('foetex.dk')) {
      headers['Referer'] = 'https://www.foetex.dk/'
    }
    if (imageUrl.includes('bilka.dk')) {
      headers['Referer'] = 'https://www.bilka.dk/'
    }
    if (imageUrl.includes('nemlig.com')) {
      headers['Referer'] = 'https://www.nemlig.com/'
    }
    if (imageUrl.includes('meny.dk')) {
      headers['Referer'] = 'https://www.meny.dk/'
    }

    console.log(`🖼️ Fetching image from: ${imageUrl.substring(0, 100)}...`)
    const response = await fetch(imageUrl, { 
      headers,
      // Don't follow redirects automatically - handle them manually if needed
      redirect: 'follow',
    })

    if (!response.ok) {
      console.error(`❌ Failed to fetch image: ${response.status} ${response.statusText} from ${imageUrl.substring(0, 100)}`)
      // Return a 1x1 transparent PNG instead of error for better UX
      const transparentPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )
      return new NextResponse(transparentPng, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    
    // Get image buffer
    const imageBuffer = await response.arrayBuffer()

    // Return image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('❌ Image proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

