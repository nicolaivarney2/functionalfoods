import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-route-auth'
import {
  createCommunityRoom,
  deleteGuidanceTemplate,
  listAdminCommunity,
  updateCommunityRoom,
  upsertGuidanceTemplate,
} from '@/lib/community/actions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
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
        capacity: typeof body.capacity === 'number' ? body.capacity : 8,
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
        body: String(body.body ?? ''),
      })
      return NextResponse.json({ template })
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
