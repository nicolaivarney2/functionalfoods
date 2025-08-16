export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { downloadBulkImages } from '@/lib/image-downloader'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting image download process...')
    
    // Check if we're in a serverless environment
    const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
    
    if (isServerless) {
      console.log('⚠️  Serverless environment detected - image download not supported')
      return NextResponse.json({
        success: false,
        message: 'Image download not supported in serverless environment',
        error: 'This feature requires a local environment with file system access'
      }, { status: 400 })
    }
    
    // Get recipes from request body instead of file system
    const body = await request.json()
    const { recipes } = body
    
    if (!recipes || !Array.isArray(recipes)) {
      return NextResponse.json({
        success: false,
        message: 'No recipes provided in request body'
      }, { status: 400 })
    }
    
    console.log(`📸 Processing ${recipes.length} recipes for image download...`)
    
    // Download images for recipes
    const updatedRecipes = await downloadBulkImages(recipes)
    
    console.log('✅ Successfully processed recipes for image download')
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${updatedRecipes.length} recipes for image download`,
      recipeCount: updatedRecipes.length,
      recipes: updatedRecipes
    })
    
  } catch (error) {
    console.error('❌ Error processing image download:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process image download',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 