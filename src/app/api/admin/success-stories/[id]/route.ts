import { NextRequest, NextResponse } from 'next/server'
import { isMissingTableError } from '@/lib/supabase-postgrest-error'

export const dynamic = 'force-dynamic'

type PatchBody = {
  headline?: string
  displayName?: string
  dietaryApproach?: string
  exercised?: boolean
  storyText?: string
  tipsText?: string | null
  weightLossKg?: number
  durationWeeks?: number | null
  status?: 'pending' | 'approved' | 'rejected'
  moderationNote?: string | null
}

function sanitizeText(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, maxLen)
  return trimmed.length > 0 ? trimmed : undefined
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const body = (await request.json()) as PatchBody
    const updates: Record<string, unknown> = {}

    const headline = sanitizeText(body.headline, 140)
    if (headline !== undefined) updates.headline = headline

    const displayName = sanitizeText(body.displayName, 80)
    if (displayName !== undefined) updates.display_name = displayName

    const dietaryApproach = sanitizeText(body.dietaryApproach, 60)
    if (dietaryApproach !== undefined) updates.dietary_approach = dietaryApproach

    if (typeof body.exercised === 'boolean') updates.exercised = body.exercised

    const storyText = sanitizeText(body.storyText, 3000)
    if (storyText !== undefined) updates.story_text = storyText

    if (body.tipsText === null || body.tipsText === '') {
      updates.tips_text = null
    } else {
      const tipsText = sanitizeText(body.tipsText, 1600)
      if (tipsText !== undefined) updates.tips_text = tipsText
    }

    if (typeof body.weightLossKg === 'number' && body.weightLossKg > 0 && body.weightLossKg <= 300) {
      updates.weight_loss_kg = body.weightLossKg
    }

    if (body.durationWeeks === null) {
      updates.duration_weeks = null
    } else if (typeof body.durationWeeks === 'number' && body.durationWeeks > 0 && body.durationWeeks <= 520) {
      updates.duration_weeks = body.durationWeeks
    }

    if (body.moderationNote === null || body.moderationNote === '') {
      updates.moderation_note = null
    } else {
      const note = sanitizeText(body.moderationNote, 500)
      if (note !== undefined) updates.moderation_note = note
    }

    if (body.status === 'pending' || body.status === 'approved' || body.status === 'rejected') {
      updates.status = body.status
      if (body.status === 'approved') {
        updates.approved_at = new Date().toISOString()
      } else {
        updates.approved_at = null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Ingen felter at opdatere' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    async function runUpdate(payload: Record<string, unknown>) {
      return supabase.from('success_stories').update(payload).eq('id', id).select('id, status').single()
    }

    let { data, error } = await runUpdate(updates)

    if (error) {
      const message = String(error.message || '')
      const legacySchema = message.includes('headline') || message.includes('weight_loss_kg')
      if (legacySchema) {
        const legacyUpdates = { ...updates }
        delete legacyUpdates.headline
        const weightLoss = legacyUpdates.weight_loss_kg
        delete legacyUpdates.weight_loss_kg
        if (typeof weightLoss === 'number') {
          legacyUpdates.after_weight_kg = 0.1
          legacyUpdates.before_weight_kg = Number((weightLoss + 0.1).toFixed(2))
        }
        const retry = await runUpdate(legacyUpdates)
        data = retry.data
        error = retry.error
      }
    }

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: 'Succeshistorie-tabellen findes ikke endnu' }, { status: 503 })
      }
      console.error('admin success-stories PATCH', error)
      return NextResponse.json({ error: 'Kunne ikke opdatere succeshistorie', details: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Succeshistorie ikke fundet' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: data.id, status: data.status })
  } catch (error) {
    console.error('admin success-stories PATCH', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
