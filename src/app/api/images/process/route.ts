import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import sharp from 'sharp'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting image processing...')
    
    const { imageUrl, recipeSlug } = await request.json()
    console.log('📥 Received data:', { imageUrl, recipeSlug })
    
    if (!imageUrl || !recipeSlug) {
      console.log('❌ Missing required data')
      return NextResponse.json({
        success: false,
        error: 'Missing imageUrl or recipeSlug'
      }, { status: 400 })
    }

    console.log(`🖼️ Processing image for ${recipeSlug}: ${imageUrl}`)
    
    // Skip if already a storage URL
    if (imageUrl.includes('supabase.co')) {
      console.log(`   ⏭️  Skipping existing Supabase URL: ${imageUrl}`)
      return NextResponse.json({
        success: true,
        storageUrl: imageUrl
      })
    }

    // Skip if it's a placeholder
    if (imageUrl.includes('recipe-placeholder.jpg')) {
      console.log(`   ⏭️  Skipping placeholder image`)
      return NextResponse.json({
        success: true,
        storageUrl: imageUrl
      })
    }

    // Download image with proper headers
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; FunctionalFoodsBot/1.0)'
    }
    
    // Add referer for Ketoliv images
    if (imageUrl.includes('ketoliv.dk')) {
      headers['Referer'] = 'https://ketoliv.dk'
    }
    
    console.log('📡 Downloading image with headers:', headers)
    const response = await fetch(imageUrl, { headers })
    console.log('📡 Download response status:', response.status, response.statusText)
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    // Get the correct MIME type from the response
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    console.log(`   📋 Detected MIME type: ${contentType}`)
    
    console.log('📥 Converting response to buffer...')
    const imageBuffer = await response.arrayBuffer()
    console.log('📥 Buffer size:', imageBuffer.byteLength, 'bytes')
    
    // Convert to WebP with optimization (target: 150-300KB)
    console.log(`   🔧 Optimizing image to WebP format...`)
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
    
    console.log(`   📊 Original size: ${(imageBuffer.byteLength / 1024).toFixed(1)}KB, Optimized: ${(optimizedBuffer.length / 1024).toFixed(1)}KB`)
    
    // Create safe filename (no special characters, spaces, or non-ASCII)
    const safeSlug = recipeSlug
      .toLowerCase()
      .replace(/[æøå]/g, (match: string) => {
        const replacements: { [key: string]: string } = { 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }
        return replacements[match] || match
      })
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    
    const hash = createHash('md5').update(imageUrl).digest('hex').substring(0, 8)
    const filename = `${safeSlug}-${hash}.webp`
    
    console.log(`   📤 Uploading to Supabase Storage: ${filename}`)
    
    // Upload to Supabase Storage using service role client (bypasses RLS)
    console.log('🔌 Creating Supabase service client...')
    const supabase = createSupabaseServiceClient()
    console.log('🔌 Supabase service client created')
    
    console.log('📤 Starting upload...')
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(filename, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: true
      })
    
    if (error) {
      console.error('❌ Failed to upload to Supabase Storage:', error)
      
      // If bucket doesn't exist, provide helpful error
      if (error.message.includes('bucket') || error.message.includes('not found')) {
        throw new Error('Storage bucket "recipe-images" not found. Please run the SQL migration to create it.')
      }
      
      throw error
    }
    
    console.log('✅ Upload successful, data:', data)
    
    // Get public URL
    console.log('🔗 Getting public URL...')
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filename)
    
    console.log(`✅ Image uploaded to Supabase Storage: ${publicUrl}`)
    
    return NextResponse.json({
      success: true,
      storageUrl: publicUrl
    })
    
  } catch (error) {
    console.error(`❌ Failed to process image:`, error)
    console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
