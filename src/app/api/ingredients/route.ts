export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export async function GET() {
  try {
    const ingredients = await databaseService.getIngredients()
    return NextResponse.json(ingredients)
  } catch (error) {
    console.error('Error fetching ingredients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const ingredients = await request.json()
    const success = await databaseService.saveIngredients(ingredients)
    
    if (success) {
      return NextResponse.json({ message: 'Ingredients saved successfully' })
    } else {
      return NextResponse.json(
        { error: 'Failed to save ingredients' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error saving ingredients:', error)
    return NextResponse.json(
      { error: 'Failed to save ingredients' },
      { status: 500 }
    )
  }
} 