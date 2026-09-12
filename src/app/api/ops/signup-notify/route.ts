import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { notifyOpsSignup } from '@/lib/ops-user-alerts'

export const dynamic = 'force-dynamic'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function isCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const bearer = request.headers.get('authorization') || ''
  const header = request.headers.get('x-cron-secret') || ''
  return bearer === `Bearer ${secret}` || header === secret
}

function userIdFromWebhookBody(body: Record<string, unknown>): string | null {
  if (typeof body.userId === 'string' && body.userId) return body.userId
  const record = body.record
  if (record && typeof record === 'object' && record !== null && 'id' in record) {
    const id = (record as { id?: unknown }).id
    if (typeof id === 'string') return id
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = serviceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const cron = isCron(request)

  if (cron) {
    const userId = userIdFromWebhookBody(body)
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    const hint = typeof body.clientHint === 'string' ? body.clientHint : 'webhook'
    await notifyOpsSignup(supabase, userId, { clientHint: hint })
    return NextResponse.json({ ok: true })
  }

  const user = await getAuthenticatedUser(request)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const created = user.created_at ? new Date(user.created_at).getTime() : 0
  const ageMs = Date.now() - created
  if (!created || ageMs > 2 * 60 * 60 * 1000) {
    return NextResponse.json({ ok: true, skipped: 'not_recent' })
  }

  const hint = typeof body.clientHint === 'string' ? body.clientHint : 'app'
  await notifyOpsSignup(supabase, user.id, { clientHint: hint })
  return NextResponse.json({ ok: true })
}
