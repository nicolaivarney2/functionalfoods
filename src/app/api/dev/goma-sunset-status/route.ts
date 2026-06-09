import { NextResponse } from 'next/server'
import { getGomaSunsetStatus } from '@/lib/goma-sunset'

export const dynamic = 'force-dynamic'

/** Dev-only: lokal banner på madbudget m.m. når GOMA_SIMULATE_GONE=true. */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(getGomaSunsetStatus())
}
