/**
 * Manuel trigger for native grocery-sync.
 * Planlagt kørsel: GitHub Actions (grocery-native-sync.yml) — ikke Vercel cron.
 *
 * `?full=true` eller `?only=netto,rema-1000`.
 */

import { NextResponse } from 'next/server'
import { runScheduledGrocerySync } from '@/lib/grocery/run-scheduled-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.replace(/^Bearer\s+/i, '')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === cronSecret) return true
  const manualSecret = process.env.GROCERY_SYNC_SECRET
  return Boolean(manualSecret && bearer === manualSecret)
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const summary = await runScheduledGrocerySync({
    skipSnapshot: url.searchParams.get('skipSnapshot') === 'true',
    only: url.searchParams.get('only'),
    fullSync: url.searchParams.get('full') === 'true',
  })

  return NextResponse.json(summary, {
    status: summary.totalErrors > 0 ? 207 : 200,
  })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
