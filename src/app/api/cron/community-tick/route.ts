import { NextRequest, NextResponse } from 'next/server'

import { runCommunityTick } from '@/lib/community/actions'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function isAuthorized(request: Request): boolean {
  const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const cronSecret = process.env.CRON_SECRET
  return Boolean(cronSecret && bearer === cronSecret)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await runCommunityTick()
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await runCommunityTick()
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}
