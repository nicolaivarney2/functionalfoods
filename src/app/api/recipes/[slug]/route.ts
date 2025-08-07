import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const recipes = await databaseService.getRecipes()
    const recipe = recipes.find(r => r.slug === params.slug)

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