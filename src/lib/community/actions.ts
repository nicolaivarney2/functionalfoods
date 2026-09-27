import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

import { dietaryApproachLabel } from '@/lib/dietary-approach-options'
import { sendLoopsEvent } from '@/lib/loops-subscribe'
import { sendExpoPush, type ExpoPushMessage } from '@/lib/push/send-expo-push'
import { getEffectiveSubscriptionTier } from '@/lib/subscription-entitlements'

import {
  addDaysIso,
  copenhagenLocalToUtc,
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

function firstName(value: string): string {
  const word = value.trim().split(/\s+/)[0] ?? ''
  return word || 'Medlem'
}

async function displayNameFor(service: SupabaseClient, userId: string, fallbackUser?: User | null) {
  const { data: chosen } = await service
    .from('community_profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle()
  const saved = (chosen as { display_name?: string } | null)?.display_name?.trim()
  if (saved) return firstName(saved)

  if (fallbackUser) {
    const meta = (fallbackUser.user_metadata ?? {}) as { name?: string }
    if (meta.name?.trim()) return firstName(meta.name)
    if (fallbackUser.email) return firstName(fallbackUser.email.split('@')[0])
  }
  const { data } = await service.auth.admin.getUserById(userId)
  const meta = (data.user?.user_metadata ?? {}) as { name?: string }
  if (meta.name?.trim()) return firstName(meta.name)
  if (data.user?.email) return firstName(data.user.email.split('@')[0])
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
    templateId?: string | null
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
      template_id: input.templateId ?? null,
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
  const { data: accessRow } = await service
    .from('user_profiles')
    .select('community_access')
    .eq('id', params.user.id)
    .maybeSingle()
  const communityAccess = Boolean((accessRow as { community_access?: boolean } | null)?.community_access)
  if (tier !== 'premium' && !communityAccess) {
    throw Object.assign(
      new Error('Community kræver Community-abonnementet eller Premium. Madbudget er madplan og madlog.'),
      { status: 403 }
    )
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

  const [{ data: rooms, error }, { data: dayRows, error: tplError }] = await Promise.all([
    service.from('community_rooms').select('*'),
    service.from('community_guidance_templates').select('*').eq('trigger', 'day'),
  ])
  if (error) return { ok: false as const, error: error.message }
  if (tplError) return { ok: false as const, error: tplError.message }
  const dayTemplates = (dayRows ?? []) as CommunityTemplateRow[]

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
    const posted = await postedTemplateIds(service, room.id)
    const due = dueGuidance(templatesForNiche(dayTemplates, room.niche), room, now)
    for (const item of due) {
      if (posted.has(item.template.id)) continue
      const body = renderCommunityTemplate(item.template.body, {
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
          dayOffset: item.template.day_offset,
          templateId: item.template.id,
        })
      } catch {
        continue
      }
      posted.add(item.template.id)
      guidance += 1
      const day = item.template.day_offset ?? 0
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
      capacity: input.capacity ?? 10,
      duration_days: duration,
      title: input.title?.trim() || null,
      status,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message || 'Kunne ikke oprette rum')
  return data as CommunityRoomRow
}

export async function addCommunityMember(params: { roomId: string; email: string }) {
  const email = params.email.trim().replace(/[%_\\]/g, '')
  if (!email.includes('@')) throw new Error('Skriv en e-mail.')

  const service = communityServiceClient()
  const { data: profile, error: profileErr } = await service
    .from('user_profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()
  if (profileErr) throw new Error(profileErr.message)
  const userId = (profile as { id?: string } | null)?.id
  if (!userId) throw new Error('Ingen konto med den e-mail.')

  const { data: room, error: roomErr } = await service
    .from('community_rooms')
    .select('*')
    .eq('id', params.roomId)
    .maybeSingle()
  if (roomErr || !room) throw new Error('Rummet findes ikke.')
  const typed = room as CommunityRoomRow
  if (typed.status === 'archived') throw new Error('Rummet er afsluttet.')
  if (typed.member_count >= typed.capacity) throw new Error('Rummet er fyldt.')

  const { data: existing } = await service
    .from('community_memberships')
    .select('user_id')
    .eq('room_id', typed.id)
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) throw new Error('Personen er allerede med i rummet.')

  const { data: mine } = await service.from('community_memberships').select('room_id').eq('user_id', userId)
  const mineIds = (mine ?? []).map((row) => String((row as { room_id: string }).room_id))
  if (mineIds.length) {
    const { data: live } = await service
      .from('community_rooms')
      .select('id')
      .in('id', mineIds)
      .in('status', ['open', 'active'])
    if ((live ?? []).length) throw new Error('Personen er allerede med i et andet rum.')
  }

  const name = await displayNameFor(service, userId)
  const { error: joinErr } = await service.from('community_memberships').insert({
    room_id: typed.id,
    user_id: userId,
    display_name: name,
  })
  if (joinErr) throw new Error(joinErr.message)

  await insertMessage(service, {
    roomId: typed.id,
    userId,
    authorName: 'Functional Foods',
    kind: 'system',
    body: `${name} er tilmeldt rummet.`,
  })

  return { displayName: name }
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

function templatesForNiche(templates: CommunityTemplateRow[], niche: string): CommunityTemplateRow[] {
  return templates.filter((t) => t.niche === niche)
}

function dueGuidance(templates: CommunityTemplateRow[], room: CommunityRoomRow, now: Date) {
  return templates
    .filter((t) => t.trigger === 'day' && t.day_offset != null && t.send_time)
    .map((template) => ({
      template,
      at: copenhagenLocalToUtc(addDaysIso(room.start_date, template.day_offset ?? 0), template.send_time ?? '08:00'),
    }))
    .filter((item) => item.at.getTime() <= now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}

async function postedTemplateIds(service: SupabaseClient, roomId: string): Promise<Set<string>> {
  const { data } = await service
    .from('community_messages')
    .select('template_id')
    .eq('room_id', roomId)
    .not('template_id', 'is', null)
  return new Set(
    (data ?? [])
      .map((row) => (row as { template_id: string | null }).template_id)
      .filter((id): id is string => Boolean(id))
  )
}

function normalizeSendTime(value: string | null | undefined): string {
  const match = (value ?? '').trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) throw new Error('Skriv et tidspunkt, fx 08:00.')
  const hh = Number(match[1])
  const mm = Number(match[2])
  if (hh > 23 || mm > 59) throw new Error('Tidspunktet er ikke gyldigt.')
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
}

function templateWriteError(error: { code?: string; message?: string } | null, fallback: string): Error {
  if (error?.code === '23505') {
    return new Error('Der ligger allerede en besked den dag på det tidspunkt.')
  }
  return new Error(error?.message || fallback)
}

export async function upsertGuidanceTemplate(input: {
  id?: string
  niche: string
  trigger: 'on_join' | 'day'
  dayOffset?: number | null
  sendTime?: string | null
  body: string
}) {
  const service = communityServiceClient()
  const body = input.body.trim()
  if (!body) throw new Error('Skriv en besked.')
  const row = {
    niche: input.niche,
    trigger: input.trigger,
    day_offset: input.trigger === 'on_join' ? null : Math.max(0, Math.floor(input.dayOffset ?? 0)),
    send_time: input.trigger === 'on_join' ? null : normalizeSendTime(input.sendTime ?? '08:00'),
    body,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { data, error } = await service
      .from('community_guidance_templates')
      .update(row)
      .eq('id', input.id)
      .select('*')
      .single()
    if (error || !data) throw templateWriteError(error, 'Kunne ikke gemme skabelon')
    return data as CommunityTemplateRow
  }
  const { data, error } = await service.from('community_guidance_templates').insert(row).select('*').single()
  if (error || !data) throw templateWriteError(error, 'Kunne ikke oprette skabelon')
  return data as CommunityTemplateRow
}

export async function deleteGuidanceTemplate(id: string) {
  const service = communityServiceClient()
  const { error } = await service.from('community_guidance_templates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listAdminRoomMessages(roomId: string): Promise<CommunityMessageRow[]> {
  const service = communityServiceClient()
  const { data, error } = await service
    .from('community_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CommunityMessageRow[]
}

/** Skriver i rummet som Nicolai. Tager ikke en plads og blokerer ikke andre rum. */
export async function postAdminRoomMessage(params: { roomId: string; userId: string; body: string }) {
  const text = params.body.trim()
  if (!text) throw new Error('Skriv en besked.')
  if (text.length > 2000) throw new Error('Beskeden er for lang.')

  const service = communityServiceClient()
  const { data: room } = await service.from('community_rooms').select('*').eq('id', params.roomId).maybeSingle()
  if (!room) throw new Error('Rummet findes ikke.')
  const typed = room as CommunityRoomRow
  if (typed.status === 'archived') throw new Error('Forløbet er afsluttet.')

  const { data: staff } = await service.from('community_staff').select('display_name').eq('handle', 'nicolai').maybeSingle()
  const name = String((staff as { display_name?: string } | null)?.display_name || 'Nicolai')
  const message = await insertMessage(service, {
    roomId: typed.id,
    userId: params.userId,
    authorName: name,
    kind: 'user',
    body: text,
  })

  const ids = (await memberIds(service, typed.id)).filter((id) => id !== params.userId)
  await pushToUsers(service, ids, {
    title: name,
    body: text.slice(0, 80),
    data: { type: 'community', roomId: typed.id },
  })
  return message
}

/** Synlig komme/gå-besked, så rummet kan se at Nicolai er der, og når han går igen. */
export async function postAdminPresence(params: { roomId: string; action: 'join' | 'leave' }) {
  const service = communityServiceClient()
  const { data: room } = await service.from('community_rooms').select('id, status').eq('id', params.roomId).maybeSingle()
  if (!room) throw new Error('Rummet findes ikke.')
  if ((room as { status: string }).status === 'archived') throw new Error('Forløbet er afsluttet.')

  const body = params.action === 'join' ? 'Nicolai kom ind i rummet' : 'Nicolai forlod rummet'
  return insertMessage(service, {
    roomId: params.roomId,
    authorName: 'Functional Foods',
    kind: 'system',
    body,
  })
}

export async function updateCommunityStaff(handle: string, userId: string | null) {
  const service = communityServiceClient()
  const { error } = await service.from('community_staff').update({ user_id: userId }).eq('handle', handle)
  if (error) throw new Error(error.message)
}
