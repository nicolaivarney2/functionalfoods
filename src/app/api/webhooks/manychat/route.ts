import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  buildAgentContextSummary,
} from '@/lib/manychat-context'
import {
  getConfiguredManychatFieldIds,
  manychatSetCustomFields,
  shouldSyncManychatContext,
} from '@/lib/manychat'

export const dynamic = 'force-dynamic'

function extractLinkToken(body: Record<string, unknown>): string | undefined {
  if (typeof body.link_token === 'string' && body.link_token) return body.link_token.trim()
  const rawRef =
    (typeof body.ref === 'string' && body.ref) ||
    (typeof body.ref_payload === 'string' && body.ref_payload) ||
    (typeof body.payload === 'string' && body.payload) ||
    ''
  if (rawRef.includes('ff_link--')) {
    const part = rawRef.split('ff_link--')[1]?.split(/[|;\s]/)[0]?.trim()
    if (part) return part
  }
  return undefined
}

function getSubscriberId(body: Record<string, unknown>): string | undefined {
  const s =
    body.subscriber_id ??
    body.subscriberId ??
    (body.subscriber as Record<string, unknown> | undefined)?.id ??
    (body.user as Record<string, unknown> | undefined)?.id
  if (s === undefined || s === null) return undefined
  return String(s)
}

async function setSubscriberForUser(
  supabase: SupabaseClient<any>,
  userId: string,
  subscriberId: string
) {
  const now = new Date().toISOString()
  // Supabase returnerer ikke error ved update med 0 rækker — tjek eksistens først.
  const { data: existing } = await supabase.from('user_profiles').select('id').eq('id', userId).maybeSingle()

  if (existing) {
    const { error: updErr } = await supabase
      .from('user_profiles')
      .update({
        manychat_subscriber_id: subscriberId,
        updated_at: now,
      })
      .eq('id', userId)
    if (updErr) console.error('manychat link update user_profiles', updErr)
    return
  }

  const { error: insErr } = await supabase.from('user_profiles').insert({
    id: userId,
    role: 'user',
    manychat_subscriber_id: subscriberId,
    updated_at: now,
  })
  if (insErr) {
    console.error('manychat link insert user_profiles', insErr)
  }
}

/**
 * ManyChat "External request" / custom webhook: kobl subscriber ↔ FF-bruger og/eller push kort kontekst.
 * Anbefalet header: X-FF-Webhook-Secret: <MANYCHAT_WEBHOOK_SECRET> når secret er sat.
 *
 * Body (eksempel): { "subscriber_id": "...", "ref_payload": "ff_link--<token>" }
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MANYCHAT_WEBHOOK_SECRET?.trim()
  if (secret) {
    const h =
      request.headers.get('x-ff-webhook-secret') ||
      request.headers.get('X-FF-Webhook-Secret') ||
      ''
    if (h !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subscriberId = getSubscriberId(body)
  if (!subscriberId) {
    return NextResponse.json({ error: 'subscriber_id required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey) as SupabaseClient<any>

  const linkToken = extractLinkToken(body)
  let linked = false
  let profileFound = false
  let syncAttempted = false
  let fieldsAttempted = 0
  let mcOk: boolean | null = null
  let mcError: string | undefined

  if (linkToken) {
    const { data: row } = await supabase
      .from('messenger_link_tokens')
      .select('user_id, expires_at')
      .eq('token', linkToken)
      .maybeSingle()

    if (row && new Date(row.expires_at) > new Date()) {
      await setSubscriberForUser(supabase, row.user_id, subscriberId)
      await supabase.from('messenger_link_tokens').delete().eq('token', linkToken)
      linked = true
    }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, manychat_context_synced_at')
    .eq('manychat_subscriber_id', subscriberId)
    .maybeSingle()
  profileFound = Boolean(profile?.id)

  if (profile?.id && shouldSyncManychatContext(profile.manychat_context_synced_at as string | null)) {
    const summary = await buildAgentContextSummary(supabase, profile.id)
    const ids = getConfiguredManychatFieldIds()
    const fields: { field_id: number; field_value: string }[] = []
    if (ids.ffUserId && !Number.isNaN(ids.ffUserId)) {
      fields.push({ field_id: ids.ffUserId, field_value: profile.id })
    }
    if (ids.agentSummary && !Number.isNaN(ids.agentSummary)) {
      fields.push({ field_id: ids.agentSummary, field_value: summary })
    }

    if (fields.length > 0) {
      syncAttempted = true
      fieldsAttempted = fields.length
      const mc = await manychatSetCustomFields(subscriberId, fields)
      mcOk = mc.ok
      mcError = mc.error
      if (mc.ok) {
        await supabase
          .from('user_profiles')
          .update({ manychat_context_synced_at: new Date().toISOString() })
          .eq('id', profile.id)
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('manychatSetCustomFields', mc.error)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    linked,
    debug: {
      profile_found: profileFound,
      sync_attempted: syncAttempted,
      fields_attempted: fieldsAttempted,
      mc_ok: mcOk,
      mc_error: mcError,
    },
  })
}
