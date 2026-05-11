import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import sharp from 'sharp'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { isMissingTableError } from '@/lib/supabase-postgrest-error'

export const dynamic = 'force-dynamic'

const BUCKET = 'success-stories'
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

type SuccessStoryRow = {
  id: string
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
}

function missingTablesResponse(error: { code?: string; message?: string }) {
  return NextResponse.json(
    {
      error: 'Succeshistorie-tabellen mangler i databasen',
      details:
        'Kør SQL-filen add-success-stories-tables.sql i Supabase SQL Editor, vent få sekunder og genindlæs siden.',
      code: error.code,
    },
    { status: 503 }
  )
}

function toNum(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function sanitizeText(value: FormDataEntryValue | null, maxLen = 1200): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

async function optimizeImage(file: File): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer())
  return sharp(input)
    .rotate()
    .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toBuffer()
}

async function verifyTurnstile(token: string, request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || undefined
  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)
  if (ip) form.set('remoteip', ip.split(',')[0].trim())

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { success?: boolean }
  return Boolean(data?.success)
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

    const { data, error } = await supabase
      .from('success_stories')
      .select(
        'id, headline, display_name, dietary_approach, exercised, story_text, tips_text, weight_loss_kg, before_weight_kg, after_weight_kg, duration_weeks, reported_at, created_at, before_image_path, after_image_path'
      )
      .eq('status', 'approved')
      .order('reported_at', { ascending: false })
      .limit(120)

    let rows = (data ?? []) as SuccessStoryRow[]
    if (error) {
      const message = String(error.message || '')
      const shouldFallbackLegacySelect =
        message.includes('headline') || message.includes('weight_loss_kg')
      if (!shouldFallbackLegacySelect) {
        if (isMissingTableError(error)) return missingTablesResponse(error)
        return NextResponse.json({ error: 'Kunne ikke hente succeshistorier' }, { status: 500 })
      }

      // Legacy schema fallback (before headline/weight_loss_kg columns were added)
      const { data: legacyData, error: legacyError } = await supabase
        .from('success_stories')
        .select(
          'id, display_name, dietary_approach, exercised, story_text, tips_text, before_weight_kg, after_weight_kg, duration_weeks, reported_at, created_at, before_image_path, after_image_path'
        )
        .eq('status', 'approved')
        .order('reported_at', { ascending: false })
        .limit(120)
      if (legacyError) {
        return NextResponse.json({ error: 'Kunne ikke hente succeshistorier' }, { status: 500 })
      }
      rows = ((legacyData ?? []) as any[]).map((row) => ({
        ...row,
        headline: null,
        weight_loss_kg: null,
      }))
    }

    const stories = await Promise.all(
      rows.map(async (row) => {
        const [beforeSigned, afterSigned] = await Promise.all([
          supabase.storage.from(BUCKET).createSignedUrl(row.before_image_path, SIGNED_URL_SECONDS),
          supabase.storage.from(BUCKET).createSignedUrl(row.after_image_path, SIGNED_URL_SECONDS),
        ])
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
          headline: row.headline || `${row.display_name} tabte ${Number(weightLossKg.toFixed(1))} kg`,
          displayName: row.display_name,
          dietaryApproach: row.dietary_approach,
          exercised: row.exercised,
          storyText: row.story_text,
          tipsText: row.tips_text,
          beforeWeightKg: row.before_weight_kg,
          afterWeightKg: row.after_weight_kg,
          durationWeeks: row.duration_weeks,
          reportedAt: row.reported_at,
          beforeImageUrl: beforeSigned.data?.signedUrl ?? null,
          afterImageUrl: afterSigned.data?.signedUrl ?? null,
          weightLossKg,
        }
      })
    )

    const totalStories = stories.length
    const averageWeightLossKg =
      totalStories > 0
        ? Number((stories.reduce((sum, item) => sum + item.weightLossKg, 0) / totalStories).toFixed(1))
        : 0
    const withExercise = stories.filter((s) => s.exercised)
    const withoutExercise = stories.filter((s) => !s.exercised)

    const byDiet = stories.reduce<Record<string, { totalLoss: number; count: number }>>((acc, story) => {
      const key = story.dietaryApproach || 'ukendt'
      acc[key] = acc[key] || { totalLoss: 0, count: 0 }
      acc[key].totalLoss += story.weightLossKg
      acc[key].count += 1
      return acc
    }, {})

    const topDiet = Object.entries(byDiet)
      .map(([diet, value]) => ({ diet, avgLoss: value.totalLoss / value.count, count: value.count }))
      .sort((a, b) => b.avgLoss - a.avgLoss)[0] || null

    return NextResponse.json({
      success: true,
      stories,
      stats: {
        totalStories,
        averageWeightLossKg,
        withExerciseCount: withExercise.length,
        withoutExerciseCount: withoutExercise.length,
        avgWithExercise:
          withExercise.length > 0
            ? Number((withExercise.reduce((sum, item) => sum + item.weightLossKg, 0) / withExercise.length).toFixed(1))
            : 0,
        avgWithoutExercise:
          withoutExercise.length > 0
            ? Number((withoutExercise.reduce((sum, item) => sum + item.weightLossKg, 0) / withoutExercise.length).toFixed(1))
            : 0,
        topDietaryApproach: topDiet ? { ...topDiet, avgLoss: Number(topDiet.avgLoss.toFixed(1)) } : null,
      },
    })
  } catch (error) {
    console.error('success-stories GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Du skal være logget ind for at indsende.' }, { status: 401 })

    const formData = await request.formData()
    const displayName = sanitizeText(formData.get('displayName'), 80)
    const headline = sanitizeText(formData.get('headline'), 140)
    const dietaryApproach = sanitizeText(formData.get('dietaryApproach'), 60)
    const exercised = String(formData.get('exercised') || 'no') === 'yes'
    const storyText = sanitizeText(formData.get('storyText'), 3000)
    const tipsText = sanitizeText(formData.get('tipsText'), 1600)
    const reportedAt = sanitizeText(formData.get('reportedAt'), 20) || new Date().toISOString().slice(0, 10)
    const weightLossKg = toNum(formData.get('weightLossKg'))
    const durationWeeks = toNum(formData.get('durationWeeks'))
    const captchaToken = sanitizeText(formData.get('captchaToken'), 1000)
    const beforeImage = formData.get('beforeImage') as File | null
    const afterImage = formData.get('afterImage') as File | null

    if (!headline || !displayName || !dietaryApproach || !storyText) {
      return NextResponse.json({ error: 'Udfyld overskrift, navn, kostniche og din historie.' }, { status: 400 })
    }
    if (!beforeImage || !afterImage) {
      return NextResponse.json({ error: 'Før- og efterbillede er påkrævet.' }, { status: 400 })
    }
    if (!beforeImage.type.startsWith('image/') || !afterImage.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Upload gyldige billedfiler.' }, { status: 400 })
    }
    if (beforeImage.size > MAX_IMAGE_SIZE_BYTES || afterImage.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Billeder må maks være 10 MB hver.' }, { status: 400 })
    }
    if (weightLossKg === null || weightLossKg <= 0 || weightLossKg > 300) {
      return NextResponse.json({ error: 'Angiv tabte kilo (mellem 0,1 og 300).' }, { status: 400 })
    }
    if (durationWeeks !== null && (durationWeeks <= 0 || durationWeeks > 520)) {
      return NextResponse.json({ error: 'Forløbstid skal være mellem 1 og 520 uger.' }, { status: 400 })
    }
    if (process.env.TURNSTILE_SECRET_KEY && !captchaToken) {
      return NextResponse.json({ error: 'Captcha mangler.' }, { status: 400 })
    }
    if (captchaToken) {
      const isCaptchaOk = await verifyTurnstile(captchaToken, request)
      if (!isCaptchaOk) {
        return NextResponse.json({ error: 'Captcha kunne ikke verificeres.' }, { status: 400 })
      }
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profileError) {
      return NextResponse.json({ error: 'Kunne ikke verificere brugerrolle.' }, { status: 500 })
    }
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    if (!isAdmin) {
      const { data: existing, error: existingError } = await supabase
        .from('success_stories')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .limit(1)

      if (existingError) {
        if (isMissingTableError(existingError)) return missingTablesResponse(existingError)
        return NextResponse.json({ error: 'Kunne ikke validere eksisterende indsendelse.' }, { status: 500 })
      }
      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'Du har allerede indsendt en succeshistorie. Kontakt os hvis du vil opdatere den.' },
          { status: 409 }
        )
      }
    }

    const [optimizedBefore, optimizedAfter] = await Promise.all([optimizeImage(beforeImage), optimizeImage(afterImage)])
    const hash = createHash('md5').update(randomUUID()).digest('hex').slice(0, 10)
    const basePath = `${user.id}/${Date.now()}-${hash}`
    const beforePath = `${basePath}-before.webp`
    const afterPath = `${basePath}-after.webp`

    const [uploadBefore, uploadAfter] = await Promise.all([
      supabase.storage.from(BUCKET).upload(beforePath, optimizedBefore, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false,
      }),
      supabase.storage.from(BUCKET).upload(afterPath, optimizedAfter, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false,
      }),
    ])

    if (uploadBefore.error || uploadAfter.error) {
      console.error('success-stories upload', uploadBefore.error || uploadAfter.error)
      return NextResponse.json({ error: 'Kunne ikke uploade billeder.' }, { status: 500 })
    }

    const basePayload = {
      user_id: user.id,
      display_name: displayName,
      dietary_approach: dietaryApproach,
      exercised,
      story_text: storyText,
      tips_text: tipsText || null,
      duration_weeks: durationWeeks,
      reported_at: reportedAt,
      before_image_path: beforePath,
      after_image_path: afterPath,
      status: isAdmin ? 'approved' : 'pending',
      approved_at: isAdmin ? new Date().toISOString() : null,
    }

    const fallbackAfter = 0.1
    const fallbackBefore = Number((weightLossKg + fallbackAfter).toFixed(2))
    let insertError: { message?: string; code?: string } | null = null

    // Attempt A: newest schema (headline + weight_loss_kg)
    const { error: insertNewSchemaError } = await supabase.from('success_stories').insert({
      ...basePayload,
      headline,
      weight_loss_kg: weightLossKg,
      before_weight_kg: null,
      after_weight_kg: null,
    })
    insertError = insertNewSchemaError

    if (insertError) {
      const message = String(insertError.message || '')
      const missingHeadline = message.includes('headline')

      if (!missingHeadline) {
        // Attempt B: schema with headline, but without weight_loss_kg (legacy compatible values).
        const { error: insertWithHeadlineLegacyFieldsError } = await supabase.from('success_stories').insert({
          ...basePayload,
          headline,
          before_weight_kg: fallbackBefore,
          after_weight_kg: fallbackAfter,
        })
        insertError = insertWithHeadlineLegacyFieldsError
      }

      if (insertError && String(insertError.message || '').includes('headline')) {
        // Attempt C: old schema with no headline column.
        const { error: insertNoHeadlineLegacyError } = await supabase.from('success_stories').insert({
          ...basePayload,
          before_weight_kg: fallbackBefore,
          after_weight_kg: fallbackAfter,
        })
        insertError = insertNoHeadlineLegacyError
      }
    }

    if (insertError) {
      if (isMissingTableError(insertError)) return missingTablesResponse(insertError)
      if (String(insertError.message || '').includes('success_stories_one_active_per_user_idx')) {
        return NextResponse.json(
          {
            error:
              'Databasen har stadig gammel begrænsning (max 1 aktiv succeshistorie pr. bruger). Kør SQL-migrationen eller DROP INDEX success_stories_one_active_per_user_idx.',
            details: insertError.message || null,
          },
          { status: 409 }
        )
      }
      console.error('success-stories insert', insertError)
      return NextResponse.json(
        {
          error: 'Kunne ikke gemme succeshistorien.',
          details: insertError.message || null,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: isAdmin
        ? 'Succeshistorie publiceret.'
        : 'Tak! Din succeshistorie er modtaget og afventer godkendelse.',
    })
  } catch (error) {
    console.error('success-stories POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
