import { NextResponse } from 'next/server'

import { listAppCommunityRooms } from '@/lib/community/actions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rooms = await listAppCommunityRooms()
    return NextResponse.json({ rooms })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunne ikke hente rum' },
      { status: 500 }
    )
  }
}
