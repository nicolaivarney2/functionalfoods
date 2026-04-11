import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'recipe-images'

/** formData: image (File), optional purpose: "section" | "header" (default section) */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const purposeRaw = (formData.get('purpose') as string | null)?.toLowerCase()
    const isHeader = purposeRaw === 'header'

    if (!file) {
      return NextResponse.json({ success: false, error: 'Ingen fil valgt' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Filen skal være et billede' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Filen er for stor (max 5MB)' }, { status: 400 })
    }

    const imageBuffer = await file.arrayBuffer()

    const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
      .webp({
        quality: 82,
        effort: 6,
        nearLossless: false,
      })
      .resize(isHeader ? 1920 : 1200, isHeader ? 720 : 900, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()

    const hash = createHash('md5').update(file.name + Date.now().toString()).digest('hex').substring(0, 10)
    const fileName = isHeader
      ? `blog-header-${Date.now()}-${hash}.webp`
      : `blog-section-${Date.now()}-${hash}.webp`
    const storagePath = isHeader ? `blog/header/${fileName}` : `blog-sections/${fileName}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, optimizedBuffer, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      console.error('upload-blog-section-image upload', uploadError)
      return NextResponse.json(
        { success: false, error: 'Fejl ved upload: ' + uploadError.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
    })
  } catch (error: unknown) {
    console.error('upload-blog-section-image', error)
    const message = error instanceof Error ? error.message : 'Ukendt fejl'
    return NextResponse.json({ success: false, error: 'Fejl ved upload af billede', details: message }, { status: 500 })
  }
}
