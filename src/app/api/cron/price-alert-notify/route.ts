/**
 * Prisalarm-notifikationer. Planlagt kørsel: GitHub Actions, ikke Vercel cron.
 * Manuel: GET/POST med Bearer $CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runPriceAlertNotify } from '@/lib/price-alerts/run-price-alert-notify'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function isAuthorized(request: Request): boolean {
  const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const cronSecret = process.env.CRON_SECRET
  return Boolean(cronSecret && bearer === cronSecret)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await runPriceAlertNotify()
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await runPriceAlertNotify()
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}
