import { NextResponse } from 'next/server'
import { isGomaSimulateGone } from '@/lib/goma-sunset'

export const dynamic = 'force-dynamic'

/** Dev-only flag til madbudget-banneret. Svaret nævner ikke leverandører. */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ simulateGone: isGomaSimulateGone() })
}
