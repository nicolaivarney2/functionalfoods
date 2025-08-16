import { createHash } from 'crypto'
import { createSupabaseClient } from './supabase'
import sharp from 'sharp'

// Check if we're in a serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

export interface ImageDownloadResult {
  success: boolean
  localPath?: string
  storageUrl?: string
  error?: string
}

export async function downloadAndStoreImage(imageUrl: string, recipeSlug: string): Promise<ImageDownloadResult> {
  try {
    console.log(`🖼️ Attempting to download image for ${recipeSlug}: ${imageUrl}`)
    
    // Skip if already a local path or storage URL
    if (imageUrl.startsWith('/images/') || imageUrl.includes('supabase.co')) {
      console.log(`   ⏭️  Skipping existing path: ${imageUrl}`)
      return { success: true, localPath: imageUrl }
    }

    // Skip if it's a placeholder
    if (imageUrl.includes('recipe-placeholder.jpg')) {
      console.log(`   ⏭️  Skipping placeholder image`)
      return { success: true, localPath: imageUrl }
    }

    // Download image with proper headers
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; FunctionalFoodsBot/1.0)'
    }
    
    // Add referer for Ketoliv images
    if (imageUrl.includes('ketoliv.dk')) {
      headers['Referer'] = 'https://ketoliv.dk'
    }
    
    const response = await fetch(imageUrl, { headers })
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    // Get the correct MIME type from the response
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    console.log(`   📋 Detected MIME type: ${contentType}`)
    
    const imageBuffer = await response.arrayBuffer()
    
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
      .replace(/[æøå]/g, (match) => {
        const replacements: { [key: string]: string } = { 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }
        return replacements[match] || match
      })
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    
    const hash = createHash('md5').update(imageUrl).digest('hex').substring(0, 8)
    const filename = `${safeSlug}-${hash}.webp`
    
    console.log(`   📤 Uploading to Supabase Storage: ${filename}`)
    
    // Upload to Supabase Storage
    const supabase = createSupabaseClient()
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
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filename)
    
    console.log(`✅ Image uploaded to Supabase Storage: ${publicUrl}`)
    
    return {
      success: true,
      storageUrl: publicUrl,
      localPath: publicUrl // Use storage URL as local path for consistency
    }
    
  } catch (error) {
    console.error(`❌ Failed to download/store image for ${recipeSlug}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function downloadRecipeImages(recipe: any): Promise<any> {
  console.log(`🖼️ Processing recipe: ${recipe.title} (${recipe.slug})`)
  console.log(`   Current imageUrl: ${recipe.imageUrl}`)
  
  const updatedRecipe = { ...recipe }
  
  if (recipe.imageUrl) {
    const result = await downloadAndStoreImage(recipe.imageUrl, recipe.slug)
    if (result.success && result.localPath) {
      console.log(`   ✅ Image download successful: ${recipe.imageUrl} -> ${result.localPath}`)
      updatedRecipe.imageUrl = result.localPath
    } else {
      console.log(`   ❌ Image download failed: ${result.error}`)
    }
  } else {
    console.log(`   ⚠️  No imageUrl found for recipe`)
  }
  
  console.log(`   Final imageUrl: ${updatedRecipe.imageUrl}`)
  return updatedRecipe
}

export async function downloadBulkImages(recipes: any[]): Promise<any[]> {
  console.log(`🖼️ Starting bulk image download for ${recipes.length} recipes...`)
  
  const updatedRecipes = []
  
  for (const recipe of recipes) {
    try {
      const result = await downloadAndStoreImage(recipe.imageUrl, recipe.slug)
      
      if (result.success && result.localPath) {
        updatedRecipes.push({
          ...recipe,
          imageUrl: result.localPath
        })
      } else {
        // Keep original image URL if download failed
        updatedRecipes.push({
          ...recipe,
          imageUrl: recipe.imageUrl || '/images/recipe-placeholder.jpg'
        })
      }
      
      // Add small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`❌ Error processing recipe ${recipe.slug}:`, error)
      // Keep original image URL if processing failed
      updatedRecipes.push({
        ...recipe,
        imageUrl: recipe.imageUrl || '/images/recipe-placeholder.jpg'
      })
    }
  }
  
  console.log(`✅ Bulk image download completed. Processed ${updatedRecipes.length} recipes.`)
  return updatedRecipes
} 