import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `recipe-${recipeId}-${Date.now()}.${fileExt}`
    const filePath = `recipe-images/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(filePath, file, {
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

    console.log(`✅ Image uploaded successfully: ${imageUrl}`)

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      fileName: fileName,
      message: 'Billede uploadet succesfuldt'
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
