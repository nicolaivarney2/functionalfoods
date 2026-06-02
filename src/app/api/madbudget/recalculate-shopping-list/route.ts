import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mealPlanGenerator } from '@/lib/meal-plan-system'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

type MealType = 'breakfast' | 'lunch' | 'dinner'

async function getUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) return user
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const grid = body?.mealPlanGrid as Record<
      DayKey,
      Record<MealType, Record<string, unknown> | null>
    >
    const family = body?.family
    if (!grid || !family?.adultsProfiles) {
      return NextResponse.json({ error: 'mealPlanGrid og family er påkrævet' }, { status: 400 })
    }

    const syncedGrid = mealPlanGenerator.applyHouseholdServingsToGrid(grid, {
      adults: Number(family.adults) || 1,
      childrenAges: family.childrenAges || [],
      adultsProfiles: family.adultsProfiles,
    })

    const dietaryApproachId =
      body?.dietaryApproachId ||
      family?.planDietaryApproach ||
      family.adultsProfiles?.find((p: { dietaryApproach?: string }) => p.dietaryApproach)
        ?.dietaryApproach

    const shoppingList = await mealPlanGenerator.buildShoppingListFromMadbudgetGrid(
      syncedGrid,
      1,
      {
        adults: Number(family.adults) || 1,
        childrenAges: family.childrenAges || [],
        adultsProfiles: family.adultsProfiles,
        planDietaryApproach: dietaryApproachId,
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        shoppingList,
        syncedGrid,
      },
    })
  } catch (error) {
    console.error('recalculate-shopping-list:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Genberegning fejlede' },
      { status: 500 }
    )
  }
}
