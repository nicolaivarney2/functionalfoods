import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'
    
    if (!departmentId) {
      return NextResponse.json({ error: 'Missing departmentId' }, { status: 400 })
    }
    
    const remaUrl = `https://api.digital.rema1000.dk/api/v3/departments/${departmentId}/products?page=${page}&limit=${limit}`
    
    console.log(`🔄 Proxying request to: ${remaUrl}`)
    
    const response = await fetch(remaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FunctionalFoods/1.0)',
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok) {
      console.error(`❌ REMA API error: ${response.status} ${response.statusText}`)
      return NextResponse.json({ error: 'REMA API error' }, { status: response.status })
    }
    
    const data = await response.json()
    
    console.log(`✅ Proxied ${data.data?.length || 0} products from department ${departmentId}`)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
