import { NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    console.log('🍽️ GET /api/recipes called')
    const recipes = await databaseService.getRecipes()
    console.log(`✅ Returning ${recipes.length} recipes`)
    return NextResponse.json(recipes)
  } catch (error) {
    console.error('❌ Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 