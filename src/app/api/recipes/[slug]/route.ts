import { NextRequest, NextResponse } from 'next/server'
import { getRecipeBySlugServer } from '@/lib/recipe-storage-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const recipe = getRecipeBySlugServer(params.slug) // Uses server-side storage

    if (!recipe) {
      return NextResponse.json({
        error: 'Recipe not found'
      }, { status: 404 })
    }

    return NextResponse.json(recipe)

  } catch (error) {
    console.error('Error getting recipe:', error)
    return NextResponse.json({
      error: 'Failed to get recipe'
    }, { status: 500 })
  }
} 