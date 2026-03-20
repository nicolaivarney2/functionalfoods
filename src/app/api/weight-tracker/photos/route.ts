import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import sharp from 'sharp'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { isMissingTableError, missingWeightTrackerTablesResponse } from '@/lib/supabase-postgrest-error'

export const dynamic = 'force-dynamic'

const BUCKET = 'weight-progress'
/** Signed URLs til privat bucket — kort nok til at mindske læk, lang nok til almindelig brug. */
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7 // 7 dage

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const adultIndex = parseInt(searchParams.get('adultIndex') ?? '0', 10)
    if (Number.isNaN(adultIndex) || adultIndex < 0) {
      return NextResponse.json({ error: 'Ugyldig adultIndex' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('weight_progress_photos')
      .select('id, storage_path, photo_date, created_at')
      .eq('user_id', user.id)
      .eq('adult_index', adultIndex)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('weight_progress_photos GET', error)
      if (isMissingTableError(error)) return missingWeightTrackerTablesResponse(error)
      return NextResponse.json({ error: 'Kunne ikke hente billeder', details: error.message }, { status: 500 })
    }

    const rows = data ?? []
    const withSigned = await Promise.all(
      rows.map(async (row) => {
        const { data: signed, error: signErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS)
        if (signErr) {
          console.error('createSignedUrl', signErr)
        }
        return {
          id: row.id,
          photo_date: row.photo_date,
          created_at: row.created_at,
          signedUrl: signed?.signedUrl ?? null,
        }
      })
    )

    return NextResponse.json({ success: true, data: withSigned })
  } catch (e) {
    console.error('weight-tracker/photos GET', e)
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const adultIndex = parseInt(String(formData.get('adultIndex') ?? '0'), 10)
    const photoDateRaw = formData.get('photoDate') as string | null

    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Vælg et billede' }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Billedet må max være 8 MB' }, { status: 400 })
    }
    if (Number.isNaN(adultIndex) || adultIndex < 0) {
      return NextResponse.json({ error: 'Ugyldig person' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    // Samme idé som opskriftsbilleder: WebP + resize — her lidt større max-kant end opskrift (krop/før-efter),
    // men stadig langt mindre end rå telefonfiler. rotate() retter EXIF-orientering og hjælper med at strippe metadata.
    let optimized: Buffer
    try {
      optimized = await sharp(buf)
        .rotate()
        .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 76, effort: 6 })
        .toBuffer()
    } catch (imgErr) {
      console.error('weight-progress sharp', imgErr)
      return NextResponse.json(
        {
          error: 'Kunne ikke behandle billedet',
          details: 'Prøv at gemme som JPG eller PNG og upload igen (nogle HEIC-filer understøttes ikke på serveren).',
        },
        { status: 422 }
      )
    }

    const hash = createHash('md5').update(randomUUID()).digest('hex').slice(0, 10)
    const path = `${user.id}/${adultIndex}/${Date.now()}-${hash}.webp`

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, optimized, {
      contentType: 'image/webp',
      upsert: false,
    })

    if (upErr) {
      console.error('weight-progress upload', upErr)
      return NextResponse.json(
        {
          error:
            'Upload fejlede. Opret privat bucket "weight-progress" i Supabase Storage og tjek at service role må uploade.',
        },
        { status: 500 }
      )
    }

    let photoDate: string | null = null
    if (photoDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(photoDateRaw)) photoDate = photoDateRaw

    const { data: row, error: insErr } = await supabase
      .from('weight_progress_photos')
      .insert({
        user_id: user.id,
        adult_index: adultIndex,
        storage_path: path,
        public_url: null,
        photo_date: photoDate,
      })
      .select('id, photo_date, created_at')
      .single()

    if (insErr) {
      console.error('weight_progress_photos insert', insErr)
      await supabase.storage.from(BUCKET).remove([path])
      if (isMissingTableError(insErr)) return missingWeightTrackerTablesResponse(insErr)
      return NextResponse.json(
        { error: 'Kunne ikke gemme billede-metadata', details: insErr.message, code: insErr.code },
        { status: 500 }
      )
    }

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        photo_date: row.photo_date,
        created_at: row.created_at,
        signedUrl: signed?.signedUrl ?? null,
      },
    })
  } catch (e) {
    console.error('weight-tracker/photos POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: row } = await supabase
      .from('weight_progress_photos')
      .select('storage_path')
      .eq('user_id', user.id)
      .eq('id', id)
      .maybeSingle()

    if (row?.storage_path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path])
    }

    const { error } = await supabase.from('weight_progress_photos').delete().eq('user_id', user.id).eq('id', id)

    if (error) {
      console.error('weight_progress_photos DELETE', error)
      if (isMissingTableError(error)) return missingWeightTrackerTablesResponse(error)
      return NextResponse.json({ error: 'Kunne ikke slette', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('weight-tracker/photos DELETE', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
