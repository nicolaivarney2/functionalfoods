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
import { isPriceAlertTriggered } from '@/lib/price-alerts/trigger'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function isAuthorized(request: Request): boolean {
  const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const cronSecret = process.env.CRON_SECRET
  return Boolean(cronSecret && bearer === cronSecret)
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
  const triggeredAlerts: { alert: any; cents: number }[] = []
  for (const alert of alertList) {
    const offer = offersByKey.get(`${alert.product_id}:${alert.store_id}`)
    if (!isPriceAlertTriggered(alert, offer)) continue
    const cents = Math.round(Number(offer.current_price) * 100)
    if (alert.last_notified_price_cents === cents) continue
    triggeredAlerts.push({ alert, cents })
  }

  if (triggeredAlerts.length === 0) {
    return NextResponse.json({ checked: alertList.length, notified: 0, sent: 0 })
  }

  // Gruppe-id → label (én push pr. gruppe).
  const groupIds = Array.from(
    new Set(triggeredAlerts.map((t) => t.alert.group_id).filter(Boolean)),
  ) as string[]
  const groupLabels = new Map<string, string>()
  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from('user_price_alert_groups')
      .select('id, label')
      .in('id', groupIds)
    for (const g of groups || []) groupLabels.set(g.id, g.label)
  }

  type NotifyItem =
    | { kind: 'group'; userId: string; groupId: string; label: string; count: number; alertIds: string[]; centsByAlert: Map<string, number> }
    | { kind: 'single'; alert: any; cents: number }

  const notifyItems: NotifyItem[] = []
  const groupedByKey = new Map<string, { alert: any; cents: number }[]>()
  const singles: { alert: any; cents: number }[] = []

  for (const item of triggeredAlerts) {
    if (item.alert.group_id) {
      const key = `${item.alert.user_id}:${item.alert.group_id}`
      const arr = groupedByKey.get(key) ?? []
      arr.push(item)
      groupedByKey.set(key, arr)
    } else {
      singles.push(item)
    }
  }

  for (const [key, items] of groupedByKey) {
    const [userId, groupId] = key.split(':')
    const label = groupLabels.get(groupId) || items[0]?.alert.product_name || 'Prisalarm'
    const centsByAlert = new Map<string, number>()
    for (const i of items) centsByAlert.set(i.alert.id, i.cents)
    notifyItems.push({
      kind: 'group',
      userId,
      groupId,
      label,
      count: items.length,
      alertIds: items.map((i) => i.alert.id),
      centsByAlert,
    })
  }
  for (const item of singles) {
    notifyItems.push({ kind: 'single', alert: item.alert, cents: item.cents })
  }

  const userIds = Array.from(new Set(notifyItems.map((n) => (n.kind === 'group' ? n.userId : n.alert.user_id))))
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
  for (const item of notifyItems) {
    if (item.kind === 'group') {
      const userTokens = tokensByUser.get(item.userId) ?? []
      const body =
        item.count === 1
          ? `${item.label} er på tilbud nu.`
          : `${item.label}: ${item.count} varer er på tilbud nu.`
      for (const token of userTokens) {
        messages.push({
          to: token,
          title: 'Tilbud på din prisalarm 🔔',
          body,
          data: { type: 'price_alert_group', groupId: item.groupId },
        })
      }
    } else {
      const userTokens = tokensByUser.get(item.alert.user_id) ?? []
      for (const token of userTokens) {
        messages.push({
          to: token,
          title: 'Tilbud på din prisalarm 🔔',
          body: `${item.alert.product_name} er på tilbud nu.`,
          data: { type: 'price_alert', productId: item.alert.product_id, storeId: item.alert.store_id },
        })
      }
    }
  }

  const sent = await sendExpoPush(messages)

  const now = new Date().toISOString()
  const updateTasks: PromiseLike<unknown>[] = []
  for (const item of notifyItems) {
    if (item.kind === 'group') {
      for (const alertId of item.alertIds) {
        const cents = item.centsByAlert.get(alertId)
        if (cents == null) continue
        updateTasks.push(
          supabase
            .from('user_price_alerts')
            .update({ last_triggered_at: now, last_notified_price_cents: cents })
            .eq('id', alertId),
        )
      }
    } else {
      updateTasks.push(
        supabase
          .from('user_price_alerts')
          .update({ last_triggered_at: now, last_notified_price_cents: item.cents })
          .eq('id', item.alert.id),
      )
    }
  }
  await Promise.all(updateTasks)

  return NextResponse.json({ checked: alertList.length, notified: notifyItems.length, sent })
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return run()
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return run()
}
