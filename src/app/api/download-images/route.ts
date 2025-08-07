import { NextRequest, NextResponse } from 'next/server'
import { downloadBulkImages } from '@/lib/image-downloader'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('Loading existing recipes...')
    
    // Load imported recipes
    const importedRecipesPath = path.join(process.cwd(), 'data', 'imported-recipes.json')
    if (!fs.existsSync(importedRecipesPath)) {
      return NextResponse.json({
        success: false,
        message: 'No imported recipes found'
      })
    }
    
    const importedRecipes = JSON.parse(fs.readFileSync(importedRecipesPath, 'utf8'))
    console.log(`Found ${importedRecipes.length} imported recipes`)
    
    // Download images for imported recipes
    console.log('Downloading images for imported recipes...')
    const updatedRecipes = await downloadBulkImages(importedRecipes)
    
    // Save updated recipes back to file
    fs.writeFileSync(importedRecipesPath, JSON.stringify(updatedRecipes, null, 2))
    
    console.log('✅ Successfully downloaded images for all recipes')
    
    return NextResponse.json({
      success: true,
      message: `Successfully downloaded images for ${updatedRecipes.length} recipes`,
      recipeCount: updatedRecipes.length
    })
    
  } catch (error) {
    console.error('❌ Error downloading images:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to download images',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 