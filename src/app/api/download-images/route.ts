export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { downloadBulkImages } from '@/lib/image-downloader'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting image download process...')
    
    const body = await request.json()
    const { recipes } = body
    
    if (!recipes || !Array.isArray(recipes)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request body. Expected recipes array.'
      }, { status: 400 })
    }
    
    console.log(`📋 Processing ${recipes.length} recipes for image download...`)
    
    // Download and store images using Supabase Storage
    const updatedRecipes = await downloadBulkImages(recipes)
    
    console.log('✅ Image download process completed successfully')
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${updatedRecipes.length} recipes`,
      recipes: updatedRecipes
    })
    
  } catch (error) {
    console.error('❌ Error in image download API:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to process image downloads',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 