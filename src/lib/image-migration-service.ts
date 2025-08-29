import { createSupabaseClient } from '@/lib/supabase'

export interface ImageMigrationResult {
  totalRecipes: number
  migratedImages: number
  skippedImages: number
  errors: string[]
  success: boolean
}

export class ImageMigrationService {
  private supabase = createSupabaseClient()

  async migrateAllImages(): Promise<ImageMigrationResult> {
    const result: ImageMigrationResult = {
      totalRecipes: 0,
      migratedImages: 0,
      skippedImages: 0,
      errors: [],
      success: false
    }

    try {
      console.log('🔄 Starting automatic image migration...')

      // Get all recipes with Ketoliv images
      const { data: recipes, error } = await this.supabase
        .from('recipes')
        .select('id, title, slug, imageUrl')
        .not('imageUrl', 'is', null)
        .like('imageUrl', '%ketoliv.dk%')

      if (error) {
        throw new Error(`Failed to fetch recipes: ${error.message}`)
      }

      result.totalRecipes = recipes?.length || 0
      console.log(`📊 Found ${result.totalRecipes} recipes with Ketoliv images`)

      if (!recipes || recipes.length === 0) {
        result.success = true
        return result
      }

      // Process each recipe
      for (const recipe of recipes) {
        try {
          if (!recipe.imageUrl || !recipe.slug) continue

          console.log(`🖼️ Migrating image for: ${recipe.title}`)

          // Call the image processing API
          const response = await fetch('/api/images/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: recipe.imageUrl,
              recipeSlug: recipe.slug
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`Image processing failed: ${errorData.error}`)
          }

          const imageResult = await response.json()

          if (imageResult.success && imageResult.storageUrl) {
            // Update recipe with new Supabase URL
            const { error: updateError } = await this.supabase
              .from('recipes')
              .update({ 
                imageUrl: imageResult.storageUrl,
                updatedAt: new Date().toISOString()
              })
              .eq('id', recipe.id)

            if (updateError) {
              throw new Error(`Failed to update recipe: ${updateError.message}`)
            }

            result.migratedImages++
            console.log(`✅ Migrated: ${recipe.title} -> ${imageResult.storageUrl}`)
          } else {
            result.skippedImages++
            console.log(`⏭️ Skipped: ${recipe.title} (already migrated or failed)`)
          }

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`Recipe ${recipe.title}: ${errorMsg}`)
          console.error(`❌ Failed to migrate ${recipe.title}:`, errorMsg)
        }
      }

      result.success = true
      console.log(`🎉 Image migration completed: ${result.migratedImages} migrated, ${result.skippedImages} skipped`)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Migration failed: ${errorMsg}`)
      console.error('❌ Image migration failed:', errorMsg)
    }

    return result
  }

  async getMigrationStatus(): Promise<{
    hasKetolivImages: boolean
    totalRecipes: number
    lastMigration?: string
  }> {
    try {
      const { data: recipes } = await this.supabase
        .from('recipes')
        .select('id')
        .not('imageUrl', 'is', null)
        .like('imageUrl', '%ketoliv.dk%')

      return {
        hasKetolivImages: (recipes?.length || 0) > 0,
        totalRecipes: recipes?.length || 0
      }
    } catch (error) {
      console.error('Failed to get migration status:', error)
      return { hasKetolivImages: false, totalRecipes: 0 }
    }
  }
}

