import { NextResponse } from 'next/server'
import { getAllRecipesServer } from '@/lib/recipe-storage-server'

export async function GET() {
  try {
    const recipes = getAllRecipesServer()
    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
} 