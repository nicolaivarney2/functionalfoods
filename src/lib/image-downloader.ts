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

export async function downloadAndStoreImage(imageUrl: string, recipeSlug: string): Promise<ImageDownloadResult> {
  try {
    // Skip if already a local path
    if (imageUrl.startsWith('/images/')) {
      return { success: true, localPath: imageUrl }
    }

    // Generate a unique filename based on URL and recipe slug
    const urlHash = createHash('md5').update(imageUrl).digest('hex').substring(0, 8)
    const fileExtension = path.extname(imageUrl) || '.jpg'
    const filename = `${recipeSlug}-${urlHash}${fileExtension}`
    const localPath = `/images/recipes/${filename}`
    const fullPath = path.join(process.cwd(), 'public', localPath)

    // Check if file already exists
    if (fs.existsSync(fullPath)) {
      return { success: true, localPath }
    }

    // Download the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    
    // Write to local file
    fs.writeFileSync(fullPath, Buffer.from(buffer))
    
    console.log(`Downloaded image: ${imageUrl} -> ${localPath}`)
    
    return { success: true, localPath }
  } catch (error) {
    console.error(`Error downloading image ${imageUrl}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function downloadRecipeImages(recipe: any): Promise<any> {
  const updatedRecipe = { ...recipe }
  
  if (recipe.imageUrl) {
    const result = await downloadAndStoreImage(recipe.imageUrl, recipe.slug)
    if (result.success && result.localPath) {
      updatedRecipe.imageUrl = result.localPath
    }
  }
  
  return updatedRecipe
}

export async function downloadBulkImages(recipes: any[]): Promise<any[]> {
  const updatedRecipes = []
  
  for (const recipe of recipes) {
    const updatedRecipe = await downloadRecipeImages(recipe)
    updatedRecipes.push(updatedRecipe)
  }
  
  return updatedRecipes
} 