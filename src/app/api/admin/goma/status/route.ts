import { NextResponse } from 'next/server'
import { getGomaSunsetStatus } from '@/lib/goma-sunset'

export const dynamic = 'force-dynamic'

/** GET /api/admin/goma/status — sunset/simulation flags for admin UI. */
export async function GET() {
  return NextResponse.json({ success: true, ...getGomaSunsetStatus() })
}
