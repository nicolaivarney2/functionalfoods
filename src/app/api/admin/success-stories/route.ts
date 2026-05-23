import { NextResponse } from 'next/server'
import { isMissingTableError } from '@/lib/supabase-postgrest-error'

export const dynamic = 'force-dynamic'

const BUCKET = 'success-stories'
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7

type SuccessStoryRow = {
  id: string
  user_id: string
  headline: string | null
  display_name: string
  dietary_approach: string
  exercised: boolean
  story_text: string
  tips_text: string | null
  weight_loss_kg: number | null
  before_weight_kg: number | null
  after_weight_kg: number | null
  duration_weeks: number | null
  reported_at: string
  created_at: string
  before_image_path: string
  after_image_path: string
  status: 'pending' | 'approved' | 'rejected'
  moderation_note: string | null
  approved_at: string | null
}

function mapRow(row: SuccessStoryRow, beforeUrl: string | null, afterUrl: string | null) {
  const computedFromBeforeAfter =
    typeof row.before_weight_kg === 'number' && typeof row.after_weight_kg === 'number'
      ? Math.max(0, Number(row.before_weight_kg) - Number(row.after_weight_kg))
      : null
  const weightLossKg = Number(
    (
      typeof row.weight_loss_kg === 'number'
        ? row.weight_loss_kg
        : computedFromBeforeAfter || 0
    ).toFixed(1)
  )

  return {
    id: row.id,
    userId: row.user_id,
    headline: row.headline || `${row.display_name} tabte ${weightLossKg} kg`,
    displayName: row.display_name,
    dietaryApproach: row.dietary_approach,
    exercised: row.exercised,
    storyText: row.story_text,
    tipsText: row.tips_text,
    weightLossKg,
    durationWeeks: row.duration_weeks,
    reportedAt: row.reported_at,
    createdAt: row.created_at,
    beforeImageUrl: beforeUrl,
    afterImageUrl: afterUrl,
    status: row.status,
    moderationNote: row.moderation_note,
    approvedAt: row.approved_at,
  }
}

const FULL_SELECT =
  'id, user_id, headline, display_name, dietary_approach, exercised, story_text, tips_text, weight_loss_kg, before_weight_kg, after_weight_kg, duration_weeks, reported_at, created_at, before_image_path, after_image_path, status, moderation_note, approved_at'

const LEGACY_SELECT =
  'id, user_id, display_name, dietary_approach, exercised, story_text, tips_text, before_weight_kg, after_weight_kg, duration_weeks, reported_at, created_at, before_image_path, after_image_path, status, moderation_note, approved_at'

function isLegacySchemaError(error: { message?: string } | null) {
  const message = String(error?.message || '')
  return message.includes('headline') || message.includes('weight_loss_kg')
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    let { data, error } = await supabase
      .from('success_stories')
      .select(FULL_SELECT)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error && isLegacySchemaError(error)) {
      const legacy = await supabase
        .from('success_stories')
        .select(LEGACY_SELECT)
        .order('created_at', { ascending: false })
        .limit(200)
      data = legacy.data as typeof data
      error = legacy.error
    }

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          stories: [],
          pendingCount: 0,
          missingTable: true,
        })
      }
      console.error('admin success-stories GET query', error)
      return NextResponse.json(
        { error: 'Kunne ikke hente succeshistorier', details: error.message },
        { status: 500 }
      )
    }

    const rows = ((data ?? []) as Omit<SuccessStoryRow, 'headline' | 'weight_loss_kg'>[]).map((row) => ({
      ...row,
      headline: 'headline' in row ? (row as SuccessStoryRow).headline : null,
      weight_loss_kg: 'weight_loss_kg' in row ? (row as SuccessStoryRow).weight_loss_kg : null,
    })) as SuccessStoryRow[]

    const stories = await Promise.all(
      rows.map(async (row) => {
        const [beforeSigned, afterSigned] = await Promise.all([
          supabase.storage.from(BUCKET).createSignedUrl(row.before_image_path, SIGNED_URL_SECONDS),
          supabase.storage.from(BUCKET).createSignedUrl(row.after_image_path, SIGNED_URL_SECONDS),
        ])
        return mapRow(row, beforeSigned.data?.signedUrl ?? null, afterSigned.data?.signedUrl ?? null)
      })
    )

    const statusOrder = { pending: 0, approved: 1, rejected: 2 }
    stories.sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const pendingCount = stories.filter((s) => s.status === 'pending').length

    return NextResponse.json({ stories, pendingCount })
  } catch (error) {
    console.error('admin success-stories GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
