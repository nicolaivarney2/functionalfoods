import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const recipeId = formData.get('recipeId') as string

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ingen fil valgt' 
      }, { status: 400 })
    }

    if (!recipeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Recipe ID er påkrævet' 
      }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Filen skal være et billede' 
      }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        success: false, 
        error: 'Filen er for stor (max 5MB)' 
      }, { status: 400 })
    }

    console.log(`📸 Uploading image for recipe ${recipeId}: ${file.name} (${file.size} bytes)`)

    // Convert file to buffer for processing
    const imageBuffer = await file.arrayBuffer()
    console.log(`📥 Original image size: ${(imageBuffer.byteLength / 1024).toFixed(1)}KB`)

    // Convert to WebP with optimization (same as Ketoliv import)
    console.log(`🔧 Optimizing image to WebP format...`)
    const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
      .webp({ 
        quality: 80,
        effort: 6,
        nearLossless: false
      })
      .resize(800, 600, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .toBuffer()
    
    console.log(`📊 Original size: ${(imageBuffer.byteLength / 1024).toFixed(1)}KB, Optimized: ${(optimizedBuffer.length / 1024).toFixed(1)}KB`)

    // Generate unique filename with WebP extension
    const hash = createHash('md5').update(file.name + Date.now()).digest('hex').substring(0, 8)
    const fileName = `recipe-${recipeId}-${hash}.webp`
    const filePath = `recipe-images/${fileName}`

    // Upload optimized image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(filePath, optimizedBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ 
        success: false, 
        error: 'Fejl ved upload: ' + uploadError.message 
      }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filePath)

    const imageUrl = urlData.publicUrl

    console.log(`✅ Image uploaded and optimized successfully: ${imageUrl}`)

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      fileName: fileName,
      originalSize: `${(imageBuffer.byteLength / 1024).toFixed(1)}KB`,
      optimizedSize: `${(optimizedBuffer.length / 1024).toFixed(1)}KB`,
      compressionRatio: `${((1 - optimizedBuffer.length / imageBuffer.byteLength) * 100).toFixed(1)}%`,
      message: 'Billede uploadet og komprimeret succesfuldt'
    })

  } catch (error: any) {
    console.error('Error uploading image:', error)
    return NextResponse.json({
      success: false,
      error: 'Fejl ved upload af billede',
      details: error.message
    }, { status: 500 })
  }
}
