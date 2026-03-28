import { NextRequest, NextResponse } from 'next/server'

const REMA_PROXY_TIMEOUT_MS = 8000
const MAX_DEPARTMENT_ID_LENGTH = 40

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = (searchParams.get('departmentId') || '').trim()
    const page = parseBoundedInt(searchParams.get('page'), 1, 1, 500)
    const limit = parseBoundedInt(searchParams.get('limit'), 20, 1, 100)
    
    if (!departmentId || departmentId.length > MAX_DEPARTMENT_ID_LENGTH) {
      return NextResponse.json({ error: 'Missing departmentId' }, { status: 400 })
    }
    
    const remaUrl = `https://api.digital.rema1000.dk/api/v3/departments/${departmentId}/products?page=${page}&limit=${limit}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REMA_PROXY_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(remaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FunctionalFoods/1.0)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
    
    if (!response.ok) {
      console.error(`❌ REMA API error: ${response.status} ${response.statusText}`)
      return NextResponse.json({ error: 'REMA API error' }, { status: response.status })
    }
    
    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
      },
    })
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 })
    }
    console.error('❌ Proxy error:', error)
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
