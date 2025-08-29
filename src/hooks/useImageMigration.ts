import { useEffect, useState } from 'react'
import { ImageMigrationService, ImageMigrationResult } from '@/lib/image-migration-service'

export function useImageMigration() {
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<ImageMigrationResult | null>(null)
  const [hasChecked, setHasChecked] = useState(false)

  const migrationService = new ImageMigrationService()

  useEffect(() => {
    const checkAndMigrate = async () => {
      if (hasChecked) return
      
      try {
        setHasChecked(true)
        
        // Check if there are any Ketoliv images to migrate
        const status = await migrationService.getMigrationStatus()
        
        if (status.hasKetolivImages) {
          console.log(`🔄 Found ${status.totalRecipes} recipes with Ketoliv images - starting automatic migration...`)
          
          setIsMigrating(true)
          const result = await migrationService.migrateAllImages()
          setMigrationResult(result)
          
          if (result.success) {
            console.log(`✅ Image migration completed: ${result.migratedImages} migrated, ${result.skippedImages} skipped`)
          } else {
            console.error('❌ Image migration failed:', result.errors)
          }
        } else {
          console.log('✅ No Ketoliv images found - migration not needed')
        }
      } catch (error) {
        console.error('❌ Failed to check migration status:', error)
      } finally {
        setIsMigrating(false)
      }
    }

    // Run migration check automatically
    checkAndMigrate()
  }, [hasChecked])

  return {
    isMigrating,
    migrationResult,
    hasChecked
  }
}

