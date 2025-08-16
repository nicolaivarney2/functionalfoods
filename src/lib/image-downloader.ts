// Frontend-only image downloader - server-side processing handled by API route
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

    console.log(`   📤 Sending to API for processing and upload...`)
    
    // Call API route for server-side image processing
    const response = await fetch('/api/images/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        recipeSlug
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `API request failed: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.success && result.storageUrl) {
      console.log(`✅ Image processed and uploaded via API: ${result.storageUrl}`)
      return {
        success: true,
        storageUrl: result.storageUrl,
        localPath: result.storageUrl // Use storage URL as local path for consistency
      }
    } else {
      throw new Error(result.error || 'API returned unsuccessful result')
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