import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type MacroPayload = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

function toNumber(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalizeName(s: unknown): string {
  return String(s || '').trim()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    const { searchParams } = new URL(request.url)
    const q = normalizeName(searchParams.get('q'))

    const { data: maxFoodRow, error: maxError } = await supabase
      .from('frida_foods')
      .select('food_id')
      .order('food_id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxError) {
      throw new Error(`Could not read max food_id: ${maxError.message}`)
    }

    let query = supabase
      .from('frida_foods')
      .select('food_id, food_name_da, food_name_en')
      .order('food_id', { ascending: false })
      .limit(20)

    if (q) {
      query = query.ilike('food_name_da', `%${q}%`)
    }

    const { data: recent, error: recentError } = await query
    if (recentError) {
      throw new Error(`Could not read frida_foods: ${recentError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        nextFoodId: (maxFoodRow?.food_id || 0) + 1,
        recent: recent || [],
      },
    })
  } catch (error) {
    console.error('❌ Error in GET /api/admin/frida-ingredients:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    const body = await request.json()

    const nameDa = normalizeName(body?.nameDa)
    const nameEn = normalizeName(body?.nameEn)
    const category = normalizeName(body?.category) || 'Manuel'
    const macros: MacroPayload = {
      calories: toNumber(body?.calories),
      protein: toNumber(body?.protein),
      carbs: toNumber(body?.carbs),
      fat: toNumber(body?.fat),
      fiber: toNumber(body?.fiber),
    }

    if (!nameDa) {
      return NextResponse.json({ success: false, message: 'nameDa er påkrævet' }, { status: 400 })
    }

    const { data: existingFoods, error: existingError } = await supabase
      .from('frida_foods')
      .select('food_id, food_name_da, food_name_en')
      .ilike('food_name_da', nameDa)
      .limit(1)

    if (existingError) {
      throw new Error(`Could not check existing frida_foods: ${existingError.message}`)
    }

    if (existingFoods?.length) {
      return NextResponse.json({
        success: true,
        message: 'Ingrediensen findes allerede i frida_foods',
        data: { alreadyExisted: true, food: existingFoods[0] },
      })
    }

    const { data: maxFoodRow, error: maxError } = await supabase
      .from('frida_foods')
      .select('food_id')
      .order('food_id', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (maxError) {
      throw new Error(`Could not read max food_id: ${maxError.message}`)
    }
    const foodId = (maxFoodRow?.food_id || 0) + 1
    const fridaId = `frida-${foodId}`

    const { error: foodInsertError } = await supabase.from('frida_foods').insert({
      food_id: foodId,
      food_name_da: nameDa,
      food_name_en: nameEn || nameDa,
    })
    if (foodInsertError) {
      throw new Error(`Could not insert frida_foods row: ${foodInsertError.message}`)
    }

    const { error: fridaIngredientInsertError } = await supabase.from('frida_ingredients').insert({
      id: fridaId,
      name: nameDa,
      category,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber || 0,
      vitamins: {},
      minerals: {},
    })
    if (fridaIngredientInsertError) {
      throw new Error(`Could not insert frida_ingredients row: ${fridaIngredientInsertError.message}`)
    }

    // Best effort: if parameter rows already exist in table, persist macro nutrition values there too.
    try {
      const macroNames = ['Energi (kcal)', 'Protein', 'Kulhydrat difference', 'Fedt', 'Kostfibre']
      const { data: paramRows, error: paramError } = await supabase
        .from('frida_nutrition_values')
        .select('parameter_id, parameter_name_da, parameter_name_en, sort_key')
        .in('parameter_name_da', macroNames)
        .limit(100)

      if (!paramError && Array.isArray(paramRows) && paramRows.length > 0) {
        const byName = new Map<string, any>()
        for (const row of paramRows) {
          if (!byName.has(row.parameter_name_da)) byName.set(row.parameter_name_da, row)
        }

        const payload: Array<{
          food_id: number
          parameter_id: number
          parameter_name_da: string
          parameter_name_en: string
          value: number
          sort_key: number
        }> = []
        const push = (name: string, value: number) => {
          const ref = byName.get(name)
          if (!ref || ref.parameter_id == null) return
          payload.push({
            food_id: foodId,
            parameter_id: Number(ref.parameter_id),
            parameter_name_da: String(ref.parameter_name_da || name),
            parameter_name_en: String(ref.parameter_name_en || name),
            value,
            sort_key: Number(ref.sort_key || 9999),
          })
        }
        push('Energi (kcal)', macros.calories)
        push('Protein', macros.protein)
        push('Kulhydrat difference', macros.carbs)
        push('Fedt', macros.fat)
        if (typeof macros.fiber === 'number' && macros.fiber > 0) push('Kostfibre', macros.fiber)

        if (payload.length > 0) {
          await supabase.from('frida_nutrition_values').insert(payload)
        }
      }
    } catch (nutritionInsertError) {
      console.warn('⚠️ Could not mirror macros to frida_nutrition_values:', nutritionInsertError)
    }

    return NextResponse.json({
      success: true,
      message: 'Frida-ingrediens oprettet',
      data: {
        alreadyExisted: false,
        food_id: foodId,
        frida_ingredient_id: fridaId,
        name_da: nameDa,
      },
    })
  } catch (error) {
    console.error('❌ Error in POST /api/admin/frida-ingredients:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
