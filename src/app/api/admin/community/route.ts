import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-route-auth'
import {
  addCommunityMember,
  createCommunityRoom,
  deleteGuidanceTemplate,
  listAdminCommunity,
  listAdminRoomMessages,
  postAdminPresence,
  postAdminRoomMessage,
  updateCommunityRoom,
  upsertGuidanceTemplate,
} from '@/lib/community/actions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const roomId = request.nextUrl.searchParams.get('roomId')
  try {
    if (roomId) return NextResponse.json({ messages: await listAdminRoomMessages(roomId) })
    return NextResponse.json(await listAdminCommunity())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fejl' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Ugyldig body' }, { status: 400 })

  try {
    if (body.kind === 'room') {
      const room = await createCommunityRoom({
        niche: String(body.niche ?? ''),
        startDate: String(body.startDate ?? ''),
        capacity: typeof body.capacity === 'number' ? body.capacity : 10,
        durationDays: typeof body.durationDays === 'number' ? body.durationDays : 30,
        title: typeof body.title === 'string' ? body.title : undefined,
      })
      return NextResponse.json({ room })
    }
    if (body.kind === 'template') {
      const template = await upsertGuidanceTemplate({
        id: typeof body.id === 'string' ? body.id : undefined,
        niche: String(body.niche ?? ''),
        trigger: body.trigger === 'on_join' ? 'on_join' : 'day',
        dayOffset: body.dayOffset == null ? null : Number(body.dayOffset),
        sendTime: typeof body.sendTime === 'string' ? body.sendTime : null,
        body: String(body.body ?? ''),
      })
      return NextResponse.json({ template })
    }
    if (body.kind === 'staff-presence') {
      const action = body.action === 'leave' ? 'leave' : 'join'
      const message = await postAdminPresence({ roomId: String(body.roomId ?? ''), action })
      return NextResponse.json({ message })
    }
    if (body.kind === 'add-member') {
      const added = await addCommunityMember({
        roomId: String(body.roomId ?? ''),
        email: String(body.email ?? ''),
      })
      return NextResponse.json(added)
    }
    if (body.kind === 'staff-message') {
      const message = await postAdminRoomMessage({
        roomId: String(body.roomId ?? ''),
        userId: admin.id,
        body: String(body.body ?? ''),
      })
      return NextResponse.json({ message })
    }
    return NextResponse.json({ error: 'Ukendt kind' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fejl' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id mangler' }, { status: 400 })
  }
  try {
    const room = await updateCommunityRoom(body.id, {
      status: typeof body.status === 'string' ? body.status : undefined,
      capacity: typeof body.capacity === 'number' ? body.capacity : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
    })
    return NextResponse.json({ room })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fejl' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = request.nextUrl.searchParams.get('templateId')
  if (!id) return NextResponse.json({ error: 'templateId mangler' }, { status: 400 })
  try {
    await deleteGuidanceTemplate(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fejl' }, { status: 500 })
  }
}
