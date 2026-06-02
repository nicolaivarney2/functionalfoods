#!/usr/bin/env node
/**
 * Tilføj "Svinekød, spareribs, rå" til Frida-tabellerne (Fødevaredata v7, 2008).
 *
 * Kør: node --env-file=.env.local scripts/add-frida-spareribs.mjs
 */

import { createClient } from '@supabase/supabase-js'

const NAME_DA = 'Svinekød, spareribs, rå'
const NAME_EN = 'Pork, spare ribs, raw'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

const macros = {
  calories: 281.2,
  protein: 17.2,
  carbs: 0,
  fat: 23.6,
  fiber: 0,
}

/** Vitaminer pr. 100 g — samme nøgler som øvrige frida_ingredients-rækker */
const vitamins = {
  A: 0,
  B1: 0.63,
  B2: 0.14,
  B3: 7.97,
  B6: 0.24,
  B12: 0.7,
  C: 0,
  D: 0.77,
  E: 0.1,
  Folate: 2,
  K: 0,
}

/** Mineraler pr. 100 g */
const minerals = {
  iron: 0.51,
  zinc: 3.6,
  sodium: 57,
  calcium: 5,
  phosphor: 158,
  selenium: 6.9,
  magnesium: 17,
  potassium: 273,
}

async function main() {
  const { data: existing, error: existingError } = await supabase
    .from('frida_foods')
    .select('food_id, food_name_da')
    .ilike('food_name_da', NAME_DA)
    .limit(1)

  if (existingError) throw new Error(existingError.message)
  if (existing?.length) {
    console.log(`Findes allerede: food_id ${existing[0].food_id} — ${existing[0].food_name_da}`)
    return
  }

  const { data: maxFoodRow, error: maxError } = await supabase
    .from('frida_foods')
    .select('food_id')
    .order('food_id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxError) throw new Error(maxError.message)

  const foodId = (maxFoodRow?.food_id || 0) + 1
  const fridaId = `frida-${foodId}`

  const { error: foodInsertError } = await supabase.from('frida_foods').insert({
    food_id: foodId,
    food_name_da: NAME_DA,
    food_name_en: NAME_EN,
  })
  if (foodInsertError) throw new Error(`frida_foods: ${foodInsertError.message}`)

  const { error: ingredientInsertError } = await supabase.from('frida_ingredients').insert({
    id: fridaId,
    name: NAME_DA,
    category: 'Grisekød (Svinekød)',
    description: 'Svinekød, spareribs, rå — Fødevaredata v7 (2008), manuelt tilføjet',
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    fiber: macros.fiber,
    vitamins,
    minerals,
    source: 'foedevaredata_v7_manual',
    frida_id: String(foodId),
    is_active: true,
  })
  if (ingredientInsertError) throw new Error(`frida_ingredients: ${ingredientInsertError.message}`)

  console.log(`✅ Oprettet: ${NAME_DA}`)
  console.log(`   food_id: ${foodId}`)
  console.log(`   frida_ingredients.id: ${fridaId}`)
  console.log(`   Makroer: ${macros.calories} kcal, P ${macros.protein}g, K ${macros.carbs}g, F ${macros.fat}g`)
}

main().catch((err) => {
  console.error('❌', err.message || err)
  process.exit(1)
})
