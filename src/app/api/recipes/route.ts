import { NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export async function GET() {
  try {
    const recipes = await databaseService.getRecipes()
    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
} 