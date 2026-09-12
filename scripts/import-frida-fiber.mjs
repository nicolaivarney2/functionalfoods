/**
 * Opdater KUN kostfibre på eksisterende Frida-rækker.
 * Rører ikke food_id, navne eller ingredient_matches.
 *
 *   npx tsx scripts/import-frida-fiber.mjs /sti/til/Frida5.5_Dataset.xlsx
 *
 * Forventer ark Data_Normalised med FoodID + ParameterNavn + ResVal
 * (ParameterNavn = Kostfibre).
 */
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true })

const FIBER_NAMES = new Set(['kostfibre', 'dietary fibre', 'dietary fiber', 'fiber'])

function getService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

function readFiberByFoodId(filePath) {
  const workbook = XLSX.read(readFileSync(filePath), { type: 'buffer', bookVBA: false })
  const sheetName = workbook.SheetNames.find((n) => /normalis/i.test(n)) || workbook.SheetNames.find((n) => /data/i.test(n))
  if (!sheetName) throw new Error(`Ingen Data_Normalised-ark. Ark: ${workbook.SheetNames.join(', ')}`)
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
  const byId = new Map()
  for (const row of rows) {
    const param = String(row.ParameterNavn || row.ParameterName || row.parameter_name_da || '').trim().toLowerCase()
    if (!FIBER_NAMES.has(param) && param !== 'kostfibre') continue
    const foodId = Number(row.FoodID || row.food_id || row.FoodId)
    const value = Number(row.ResVal ?? row.value ?? row.Resval)
    if (!Number.isFinite(foodId) || !Number.isFinite(value)) continue
    byId.set(foodId, value)
  }
  return byId
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('Brug: npx tsx scripts/import-frida-fiber.mjs /sti/til/Frida_Dataset.xlsx')
    process.exit(1)
  }
  console.log('Læser', file)

  const fibers = readFiberByFoodId(file)
  console.log(`Læst ${fibers.size} Kostfibre-værdier`)
  const supabase = getService()

  const existingIds = new Set()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data: existing, error } = await supabase
      .from('frida_ingredients')
      .select('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const row of existing || []) existingIds.add(String(row.id))
    if (!existing || existing.length < PAGE) break
  }

  let updated = 0
  let skippedUnknown = 0
  const ids = [...fibers.keys()]
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80)
    await Promise.all(
      chunk.map(async (foodId) => {
        const rowId = `frida-${foodId}`
        if (!existingIds.has(rowId)) {
          skippedUnknown += 1
          return
        }
        const { error: updErr } = await supabase
          .from('frida_ingredients')
          .update({ fiber: fibers.get(foodId) })
          .eq('id', rowId)
        if (updErr) throw updErr
        updated += 1
      })
    )
  }

  console.log(`Opdateret fiber på ${updated} eksisterende rækker. Sprunget nye FoodID over: ${skippedUnknown}.`)
  console.log('ingredient_matches er ikke ændret.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
