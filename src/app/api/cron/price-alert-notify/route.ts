/**
 * Prisalarm-notifikationer: scanner aktive prisalarmer, finder dem der lige er
 * udløst (vare på tilbud / nok rabat) og sender en Expo-push til brugerens
 * registrerede devices. Undgår spam ved kun at notificere når prisen er ændret
 * siden sidste notifikation (`last_notified_price_cents`).
 *
 * Scheduled via vercel.json. Manuel: GET/POST med Bearer $CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { sendExpoPush, type ExpoPushMessage } from '@/lib/push/send-expo-push'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function isAuthorized(request: Request): boolean {
  const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const cronSecret = process.env.CRON_SECRET
  return Boolean(cronSecret && bearer === cronSecret)
}

function isTriggered(alert: any, offer: any): boolean {
  if (!offer || !offer.is_on_sale) return false
  if (alert.threshold_type === 'any_sale') return true
  const discount =
    offer.discount_percentage != null
      ? Number(offer.discount_percentage)
      : offer.normal_price && offer.current_price
        ? Math.round(((offer.normal_price - offer.current_price) / offer.normal_price) * 100)
        : 0
  return discount >= (alert.min_discount_pct ?? 0)
}

async function run(): Promise<NextResponse> {
  const supabase = createSupabaseServiceClient()

  const { data: alerts, error } = await supabase
    .from('user_price_alerts')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('[price-alert-notify] failed to load alerts:', error)
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 })
  }

  const alertList = alerts || []
  if (alertList.length === 0) {
    return NextResponse.json({ checked: 0, notified: 0, sent: 0 })
  }

  // Aktuelle tilbud for de berørte produkter.
  const productIds = Array.from(new Set(alertList.map((a) => a.product_id)))
  const { data: offers } = await supabase
    .from('product_offers')
    .select('product_id, store_id, current_price, normal_price, is_on_sale, discount_percentage')
    .in('product_id', productIds)

  const offersByKey = new Map<string, any>()
  for (const o of offers || []) offersByKey.set(`${o.product_id}:${o.store_id}`, o)

  // Find alarmer der er udløst OG har en ny pris siden sidste notifikation.
  const toNotify: { alert: any; cents: number }[] = []
  for (const alert of alertList) {
    const offer = offersByKey.get(`${alert.product_id}:${alert.store_id}`)
    if (!isTriggered(alert, offer)) continue
    const cents = Math.round(Number(offer.current_price) * 100)
    if (alert.last_notified_price_cents === cents) continue
    toNotify.push({ alert, cents })
  }

  if (toNotify.length === 0) {
    return NextResponse.json({ checked: alertList.length, notified: 0, sent: 0 })
  }

  // Hent push-tokens for de berørte brugere.
  const userIds = Array.from(new Set(toNotify.map((t) => t.alert.user_id)))
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)

  const tokensByUser = new Map<string, string[]>()
  for (const t of tokens || []) {
    const arr = tokensByUser.get(t.user_id) ?? []
    arr.push(t.token)
    tokensByUser.set(t.user_id, arr)
  }

  const messages: ExpoPushMessage[] = []
  for (const { alert } of toNotify) {
    const userTokens = tokensByUser.get(alert.user_id) ?? []
    for (const token of userTokens) {
      messages.push({
        to: token,
        title: 'Tilbud på din prisalarm 🔔',
        body: `${alert.product_name} er på tilbud nu.`,
        data: { type: 'price_alert', productId: alert.product_id, storeId: alert.store_id },
      })
    }
  }

  const sent = await sendExpoPush(messages)

  // Markér som notificeret (uanset om brugeren havde et token), så vi ikke
  // gen-scanner samme pris hver kørsel.
  const now = new Date().toISOString()
  await Promise.all(
    toNotify.map(({ alert, cents }) =>
      supabase
        .from('user_price_alerts')
        .update({ last_triggered_at: now, last_notified_price_cents: cents })
        .eq('id', alert.id)
    )
  )

  return NextResponse.json({ checked: alertList.length, notified: toNotify.length, sent })
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return run()
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return run()
}
