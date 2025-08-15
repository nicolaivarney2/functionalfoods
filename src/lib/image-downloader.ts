import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'recipes')

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
}

export interface ImageDownloadResult {
  success: boolean
  localPath?: string
  error?: string
}

async function optimizeImage(input: Buffer): Promise<{ buffer: Buffer; ext: string; resized: boolean }> {
  // Allow turning off optimization instantly if environment is unstable
  if (process.env.IMAGE_OPTIMIZE !== 'true') {
    return { buffer: input, ext: '', resized: false }
  }
  try {
    // Use dynamic import so project doesn't break if sharp isn't installed
    const sharp = (await import('sharp')).default as unknown as (input?: any) => any
    const img = sharp(input)
    const meta = await img.metadata()
    const maxWidth = parseInt(process.env.IMAGE_MAX_WIDTH || '1200', 10)
    const scale = parseFloat(process.env.IMAGE_SCALE || '0.5')
    const quality = parseInt(process.env.IMAGE_WEBP_QUALITY || '75', 10)
    let pipeline = img
    if (meta.width && meta.width > 0) {
      const targetWidth = Math.min(
        maxWidth,
        Math.max(600, Math.round(meta.width * scale))
      )
      pipeline = pipeline.resize({ width: targetWidth })
    }
    const out = await pipeline.webp({ quality }).toBuffer()
    return { buffer: out, ext: '.webp', resized: true }
  } catch {
    // sharp not available or failed – return original
    return { buffer: input, ext: '', resized: false }
  }
}

export async function downloadAndStoreImage(imageUrl: string, recipeSlug: string): Promise<ImageDownloadResult> {
  try {
    console.log(`🖼️ Attempting to download image for ${recipeSlug}: ${imageUrl}`)
    
    // Skip if already a local path
    if (imageUrl.startsWith('/images/')) {
      console.log(`   ⏭️  Skipping local path: ${imageUrl}`)
      return { success: true, localPath: imageUrl }
    }

    // Skip if it's a placeholder
    if (imageUrl.includes('recipe-placeholder.jpg')) {
      console.log(`   ⏭️  Skipping placeholder image`)
      return { success: true, localPath: imageUrl }
    }

    // Generate a unique filename based on URL path and recipe slug
    let urlObj: URL
    try {
      urlObj = new URL(imageUrl)
    } catch {
      // Handle root-relative or path-only URLs from Ketoliv
      console.log(`   🔧 Converting relative URL: ${imageUrl}`)
      urlObj = new URL(imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`, 'https://ketoliv.dk')
    }
    
    console.log(`   🌐 Final URL: ${urlObj.href}`)
    
    const urlHash = createHash('md5').update(urlObj.href).digest('hex').substring(0, 8)
    const extFromPath = path.posix.extname(urlObj.pathname)
    let fileExtension = extFromPath && extFromPath.length <= 5 ? extFromPath : '.jpg'

    // We'll compute filename after potential optimization (extension may change)

    // Download the image (add headers for stricter hosts like Ketoliv)
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; FunctionalFoodsBot/1.0)'
    }
    if (/ketoliv/i.test(urlObj.hostname)) {
      headers['Referer'] = 'https://ketoliv.dk'
    }
    
    console.log(`   📥 Downloading with headers:`, headers)
    const response = await fetch(urlObj.href, { headers })
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    const arrBuf = await response.arrayBuffer()
    const originalBuffer = Buffer.from(arrBuf)
    console.log(`   💾 Downloaded ${originalBuffer.byteLength} bytes`)
    
    // Optimize (resize ~50% width and convert to webp if possible)
    const optimized = await optimizeImage(originalBuffer)
    const finalBuffer = optimized.resized ? optimized.buffer : originalBuffer
    if (optimized.resized && optimized.ext) {
      fileExtension = optimized.ext
      console.log(`   ✂️ Optimized to ${finalBuffer.length} bytes as ${fileExtension}`)
    }
    
    const filename = `${recipeSlug}-${urlHash}${fileExtension}`
    const localRelPath = path.posix.join('images', 'recipes', filename) // no leading slash for fs paths
    const fullPath = path.join(process.cwd(), 'public', localRelPath)
    console.log(`   💾 Local path: /${localRelPath}`)

    // Check if file already exists (after deciding final name)
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ File already exists: ${fullPath}`)
      return { success: true, localPath: `/${localRelPath}` }
    }
    
    // Write to local file
    fs.writeFileSync(fullPath, finalBuffer)
    
    console.log(`✅ Successfully downloaded image: ${imageUrl} -> /${localRelPath}`)
    
    return { success: true, localPath: `/${localRelPath}` }
  } catch (error) {
    console.error(`❌ Error downloading image ${imageUrl}:`, error)
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
    console.log(`📸 Processing image for recipe: ${recipe.title} (${recipe.slug})`)
    console.log(`   Original imageUrl: ${recipe.imageUrl}`)
    
    const updatedRecipe = await downloadRecipeImages(recipe)
    
    if (updatedRecipe.imageUrl !== recipe.imageUrl) {
      console.log(`   ✅ Image updated: ${recipe.imageUrl} -> ${updatedRecipe.imageUrl}`)
    } else {
      console.log(`   ⚠️  Image unchanged: ${updatedRecipe.imageUrl}`)
    }
    
    updatedRecipes.push(updatedRecipe)
  }
  
  console.log(`🖼️ Bulk image download completed. Processed ${updatedRecipes.length} recipes.`)
  return updatedRecipes
} 