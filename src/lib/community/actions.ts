import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

import { dietaryApproachLabel } from '@/lib/dietary-approach-options'
import { sendLoopsEvent } from '@/lib/loops-subscribe'
import { sendExpoPush, type ExpoPushMessage } from '@/lib/push/send-expo-push'
import { getEffectiveSubscriptionTier } from '@/lib/subscription-entitlements'

import {
  addDaysIso,
  copenhagenTodayIso,
  diffDaysIso,
  extractMentionHandles,
  renderCommunityTemplate,
  roomStatusForDates,
  type CommunityMessageKind,
  type CommunityMessageRow,
  type CommunityRoomRow,
  type CommunityTemplateRow,
} from './shared'

export function communityServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Mangler Supabase-nøgler til community')
  return createClient(url, key, { auth: { persistSession: false } })
}

function staffNotifyEmail(): string {
  return process.env.COMMUNITY_STAFF_EMAIL?.trim() || 'nicolai@functionalfoods.dk'
}

async function displayNameFor(service: SupabaseClient, userId: string, fallbackUser?: User | null) {
  if (fallbackUser) {
    const meta = (fallbackUser.user_metadata ?? {}) as { name?: string }
    if (meta.name?.trim()) return meta.name.trim()
    if (fallbackUser.email) return fallbackUser.email.split('@')[0]
  }
  const { data } = await service.auth.admin.getUserById(userId)
  const meta = (data.user?.user_metadata ?? {}) as { name?: string }
  if (meta.name?.trim()) return meta.name.trim()
  if (data.user?.email) return data.user.email.split('@')[0]
  return 'Medlem'
}

async function emailFor(service: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await service.auth.admin.getUserById(userId)
  return data.user?.email ?? null
}

async function tokensForUsers(service: SupabaseClient, userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (userIds.length === 0) return map
  const { data } = await service.from('user_push_tokens').select('user_id, token').in('user_id', userIds)
  for (const row of data ?? []) {
    const uid = String((row as { user_id: string }).user_id)
    const token = String((row as { token: string }).token)
    const list = map.get(uid) ?? []
    list.push(token)
    map.set(uid, list)
  }
  return map
}

async function pushToUsers(
  service: SupabaseClient,
  userIds: string[],
  message: Omit<ExpoPushMessage, 'to'>
) {
  const tokens = await tokensForUsers(service, userIds)
  const payload: ExpoPushMessage[] = []
  for (const uid of userIds) {
    for (const to of tokens.get(uid) ?? []) {
      payload.push({ ...message, to })
    }
  }
  if (payload.length) await sendExpoPush(payload)
}

async function emitLoops(emails: (string | null)[], eventName: string, props: Record<string, string | number | boolean>) {
  await Promise.all(
    emails
      .filter((e): e is string => Boolean(e))
      .map((email) => sendLoopsEvent({ email, eventName, eventProperties: props }))
  )
}

async function memberEmails(service: SupabaseClient, roomId: string): Promise<string[]> {
  const { data } = await service.from('community_memberships').select('user_id').eq('room_id', roomId)
  const ids = (data ?? []).map((r) => String((r as { user_id: string }).user_id))
  const emails = await Promise.all(ids.map((id) => emailFor(service, id)))
  return emails.filter((e): e is string => Boolean(e))
}

async function memberIds(service: SupabaseClient, roomId: string): Promise<string[]> {
  const { data } = await service.from('community_memberships').select('user_id').eq('room_id', roomId)
  return (data ?? []).map((r) => String((r as { user_id: string }).user_id))
}

async function insertMessage(
  service: SupabaseClient,
  input: {
    roomId: string
    userId?: string | null
    authorName: string
    kind: CommunityMessageKind
    body: string
    dayOffset?: number | null
  }
): Promise<CommunityMessageRow> {
  const { data, error } = await service
    .from('community_messages')
    .insert({
      room_id: input.roomId,
      user_id: input.userId ?? null,
      author_name: input.authorName,
      kind: input.kind,
      body: input.body,
      day_offset: input.dayOffset ?? null,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message || 'Kunne ikke gemme besked')
  return data as CommunityMessageRow
}

export async function joinCommunityRoom(params: {
  user: User
  roomId: string
}): Promise<{ room: CommunityRoomRow; alreadyMember: boolean }> {
  const service = communityServiceClient()
  const tier = await getEffectiveSubscriptionTier(service, params.user.id)
  if (tier !== 'plus' && tier !== 'premium') {
    throw Object.assign(new Error('Community kræver en aktiv prøveperiode, Madbudget eller Premium.'), { status: 403 })
  }

  const today = copenhagenTodayIso()
  const { data: room, error: roomErr } = await service
    .from('community_rooms')
    .select('*')
    .eq('id', params.roomId)
    .maybeSingle()
  if (roomErr || !room) throw Object.assign(new Error('Rummet findes ikke.'), { status: 404 })
  const typed = room as CommunityRoomRow

  const { data: existing } = await service
    .from('community_memberships')
    .select('room_id')
    .eq('room_id', typed.id)
    .eq('user_id', params.user.id)
    .maybeSingle()
  if (existing) return { room: typed, alreadyMember: true }

  if (typed.status !== 'open' || typed.start_date <= today) {
    throw Object.assign(new Error('Tilmelding er lukket — rummet er startet.'), { status: 409 })
  }
  if (typed.member_count >= typed.capacity) {
    throw Object.assign(new Error('Rummet er fyldt.'), { status: 409 })
  }

  const { data: mine } = await service.from('community_memberships').select('room_id').eq('user_id', params.user.id)
  const mineIds = (mine ?? []).map((r) => String((r as { room_id: string }).room_id))
  if (mineIds.length) {
    const { data: live } = await service
      .from('community_rooms')
      .select('id')
      .in('id', mineIds)
      .in('status', ['open', 'active'])
    if ((live ?? []).length) {
      throw Object.assign(new Error('Du er allerede med i et aktivt rum.'), { status: 409 })
    }
  }

  const name = await displayNameFor(service, params.user.id, params.user)
  const { data: members } = await service
    .from('community_memberships')
    .select('display_name')
    .eq('room_id', typed.id)
  const memberNames = (members ?? []).map((m) => String((m as { display_name: string }).display_name))

  const { error: joinErr } = await service.from('community_memberships').insert({
    room_id: typed.id,
    user_id: params.user.id,
    display_name: name,
  })
  if (joinErr) throw new Error(joinErr.message)

  const { data: joinTpl } = await service
    .from('community_guidance_templates')
    .select('*')
    .eq('niche', typed.niche)
    .eq('trigger', 'on_join')
    .maybeSingle()
  const tpl = joinTpl as CommunityTemplateRow | null
  const welcome = renderCommunityTemplate(
    tpl?.body ??
      'Velkommen! Præsentér dig gerne. Allerede med: {{members}}. Tag @nicolai hvis du har brug for en ekspert.',
    {
      niche: typed.niche,
      members: memberNames.length ? memberNames.join(', ') : 'ingen endnu — du er den første',
      startDate: typed.start_date,
    }
  )
  await insertMessage(service, {
    roomId: typed.id,
    authorName: 'Functional Foods',
    kind: 'system',
    body: welcome,
  })

  const others = (await memberIds(service, typed.id)).filter((id) => id !== params.user.id)
  await pushToUsers(service, others, {
    title: dietaryApproachLabel(typed.niche),
    body: `${name} er joinet rummet.`,
    data: { type: 'community', roomId: typed.id },
  })
  const email = await emailFor(service, params.user.id)
  await emitLoops([email], 'community-joined', {
    niche: typed.niche,
    roomId: typed.id,
    startDate: typed.start_date,
  })

  const { data: fresh } = await service.from('community_rooms').select('*').eq('id', typed.id).single()
  return { room: (fresh ?? typed) as CommunityRoomRow, alreadyMember: false }
}

export async function postCommunityMessage(params: {
  user: User
  roomId: string
  body: string
}): Promise<CommunityMessageRow> {
  const text = params.body.trim()
  if (!text) throw Object.assign(new Error('Skriv en besked.'), { status: 400 })
  if (text.length > 2000) throw Object.assign(new Error('Beskeden er for lang.'), { status: 400 })

  const service = communityServiceClient()
  const { data: room } = await service.from('community_rooms').select('*').eq('id', params.roomId).maybeSingle()
  if (!room) throw Object.assign(new Error('Rummet findes ikke.'), { status: 404 })
  const typed = room as CommunityRoomRow
  if (typed.status === 'archived') {
    throw Object.assign(new Error('Forløbet er afsluttet.'), { status: 409 })
  }

  const { data: membership } = await service
    .from('community_memberships')
    .select('display_name')
    .eq('room_id', typed.id)
    .eq('user_id', params.user.id)
    .maybeSingle()
  if (!membership) throw Object.assign(new Error('Du er ikke med i rummet.'), { status: 403 })

  const name = String((membership as { display_name: string }).display_name)
  const message = await insertMessage(service, {
    roomId: typed.id,
    userId: params.user.id,
    authorName: name,
    kind: 'user',
    body: text,
  })

  const handles = extractMentionHandles(text)
  if (handles.length) {
    await service.from('community_mentions').insert(handles.map((handle) => ({ message_id: message.id, handle })))
    const { data: staff } = await service.from('community_staff').select('handle, user_id').in('handle', handles)
    const staffRows = (staff ?? []) as { handle: string; user_id: string | null }[]
    const staffIds = staffRows.map((s) => s.user_id).filter((id): id is string => Boolean(id))
    if (staffIds.length) {
      await pushToUsers(service, staffIds, {
        title: 'Du blev tagged i Community',
        body: `${name}: ${text.slice(0, 80)}`,
        data: { type: 'community', roomId: typed.id },
      })
    }
    if (staffRows.length) {
      await emitLoops([staffNotifyEmail()], 'community-mentioned-staff', {
        niche: typed.niche,
        roomId: typed.id,
        handle: staffRows.map((s) => s.handle).join(','),
        fromName: name,
      })
    }
  }

  const others = (await memberIds(service, typed.id)).filter((id) => id !== params.user.id)
  await pushToUsers(service, others, {
    title: dietaryApproachLabel(typed.niche),
    body: `${name}: ${text.slice(0, 80)}`,
    data: { type: 'community', roomId: typed.id },
  })

  return message
}

export async function runCommunityTick(now = new Date()) {
  const service = communityServiceClient()
  const today = copenhagenTodayIso(now)
  const tomorrow = addDaysIso(today, 1)

  const { data: rooms, error } = await service.from('community_rooms').select('*')
  if (error) return { ok: false as const, error: error.message }

  let activated = 0
  let archived = 0
  let guidance = 0
  let events = 0

  for (const raw of rooms ?? []) {
    const room = raw as CommunityRoomRow
    const nextStatus = roomStatusForDates(room.start_date, room.duration_days, today)
    if (nextStatus !== room.status) {
      await service.from('community_rooms').update({ status: nextStatus }).eq('id', room.id)
      room.status = nextStatus
      if (nextStatus === 'active') activated += 1
      if (nextStatus === 'archived') archived += 1
    }

    if (room.start_date === tomorrow) {
      const marked = await markEvent(service, room.id, 'community-starts-tomorrow', today)
      if (marked) {
        events += 1
        const emails = await memberEmails(service, room.id)
        await emitLoops(emails, 'community-starts-tomorrow', {
          niche: room.niche,
          roomId: room.id,
          startDate: room.start_date,
        })
        const ids = await memberIds(service, room.id)
        await pushToUsers(service, ids, {
          title: 'Jeres rum starter i morgen',
          body: `${dietaryApproachLabel(room.niche)}-forløbet begynder ${room.start_date}.`,
          data: { type: 'community', roomId: room.id },
        })
      }
    }

    if (room.start_date === today && room.status === 'active') {
      const marked = await markEvent(service, room.id, 'community-started', today)
      if (marked) {
        events += 1
        const emails = await memberEmails(service, room.id)
        await emitLoops(emails, 'community-started', {
          niche: room.niche,
          roomId: room.id,
          startDate: room.start_date,
        })
      }
    }

    if (room.status !== 'active') continue
    const day = diffDaysIso(room.start_date, today)
    if (day < 0) continue

    const { data: tpl } = await service
      .from('community_guidance_templates')
      .select('*')
      .eq('niche', room.niche)
      .eq('trigger', 'day')
      .eq('day_offset', day)
      .maybeSingle()
    if (!tpl) continue

    const { data: already } = await service
      .from('community_messages')
      .select('id')
      .eq('room_id', room.id)
      .eq('kind', 'guidance')
      .eq('day_offset', day)
      .maybeSingle()
    if (already) continue

    const body = renderCommunityTemplate((tpl as CommunityTemplateRow).body, {
      niche: room.niche,
      members: '',
      startDate: room.start_date,
    })
    try {
      await insertMessage(service, {
        roomId: room.id,
        authorName: 'Functional Foods',
        kind: 'guidance',
        body,
        dayOffset: day,
      })
    } catch {
      continue
    }
    guidance += 1
    const emails = await memberEmails(service, room.id)
    await emitLoops(emails, 'community-guidance-posted', {
      niche: room.niche,
      day,
      roomId: room.id,
      startDate: room.start_date,
    })
    const ids = await memberIds(service, room.id)
    await pushToUsers(service, ids, {
      title: `${dietaryApproachLabel(room.niche)} · dag ${day}`,
      body: body.slice(0, 100),
      data: { type: 'community', roomId: room.id },
    })
  }

  return { ok: true as const, today, activated, archived, guidance, events }
}

async function markEvent(
  service: SupabaseClient,
  roomId: string,
  eventName: string,
  sentOn: string
): Promise<boolean> {
  const { error } = await service.from('community_room_events').insert({
    room_id: roomId,
    event_name: eventName,
    sent_on: sentOn,
  })
  return !error
}

export async function listAdminCommunity() {
  const service = communityServiceClient()
  const [{ data: rooms }, { data: templates }] = await Promise.all([
    service.from('community_rooms').select('*').order('start_date', { ascending: false }),
    service.from('community_guidance_templates').select('*').order('niche').order('day_offset'),
  ])
  return {
    rooms: (rooms ?? []) as CommunityRoomRow[],
    templates: (templates ?? []) as CommunityTemplateRow[],
  }
}

export async function createCommunityRoom(input: {
  niche: string
  startDate: string
  capacity?: number
  durationDays?: number
  title?: string
}) {
  const service = communityServiceClient()
  const today = copenhagenTodayIso()
  const duration = input.durationDays ?? 30
  const status = roomStatusForDates(input.startDate, duration, today)
  const { data, error } = await service
    .from('community_rooms')
    .insert({
      niche: input.niche,
      start_date: input.startDate,
      capacity: input.capacity ?? 8,
      duration_days: duration,
      title: input.title?.trim() || null,
      status,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message || 'Kunne ikke oprette rum')
  return data as CommunityRoomRow
}

export async function updateCommunityRoom(
  id: string,
  patch: Partial<{ status: string; capacity: number; title: string | null; start_date: string }>
) {
  const service = communityServiceClient()
  const { data, error } = await service.from('community_rooms').update(patch).eq('id', id).select('*').single()
  if (error || !data) throw new Error(error?.message || 'Kunne ikke opdatere rum')
  return data as CommunityRoomRow
}

export async function upsertGuidanceTemplate(input: {
  id?: string
  niche: string
  trigger: 'on_join' | 'day'
  dayOffset?: number | null
  body: string
}) {
  const service = communityServiceClient()
  const row = {
    niche: input.niche,
    trigger: input.trigger,
    day_offset: input.trigger === 'on_join' ? null : input.dayOffset ?? 0,
    body: input.body.trim(),
    updated_at: new Date().toISOString(),
  }
  let existingId = input.id
  if (!existingId) {
    let q = service
      .from('community_guidance_templates')
      .select('id')
      .eq('niche', input.niche)
      .eq('trigger', input.trigger)
    q = input.trigger === 'on_join' ? q.is('day_offset', null) : q.eq('day_offset', row.day_offset)
    const { data: existing } = await q.maybeSingle()
    existingId = (existing as { id?: string } | null)?.id
  }
  if (existingId) {
    const { data, error } = await service
      .from('community_guidance_templates')
      .update(row)
      .eq('id', existingId)
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message || 'Kunne ikke gemme skabelon')
    return data as CommunityTemplateRow
  }
  const { data, error } = await service.from('community_guidance_templates').insert(row).select('*').single()
  if (error || !data) throw new Error(error?.message || 'Kunne ikke oprette skabelon')
  return data as CommunityTemplateRow
}

export async function deleteGuidanceTemplate(id: string) {
  const service = communityServiceClient()
  const { error } = await service.from('community_guidance_templates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateCommunityStaff(handle: string, userId: string | null) {
  const service = communityServiceClient()
  const { error } = await service.from('community_staff').update({ user_id: userId }).eq('handle', handle)
  if (error) throw new Error(error.message)
}
