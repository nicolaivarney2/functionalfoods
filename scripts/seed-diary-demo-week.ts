#!/usr/bin/env tsx
/**
 * Indsæt demo-madlog for sidste uge (til UI-test af ugentligt tilbageblik).
 *
 *   npx tsx scripts/seed-diary-demo-week.ts              # dry-run
 *   npx tsx scripts/seed-diary-demo-week.ts --confirm    # skriv til DB
 *
 * Kræver NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY i .env.local
 */

import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const EMAIL = process.env.SEED_EMAIL ?? 'w@nicolaivarney.dk'
const LAST_MONDAY = '2026-06-22'
const DAYS = 6 // man–lør med log (søndag tom → realistisk)

type MealSeed = {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  title: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  vitamins: Record<string, number>
  minerals: Record<string, number>
}

/** Varierede dage — summer til ~11.100 kcal over 6 dage, blandede makro/mikro. */
const DAY_PLANS: MealSeed[][] = [
  [
    { meal_type: 'breakfast', title: 'Demo: Havregryn med bær', calories: 380, protein: 12, carbs: 58, fat: 9, fiber: 8, vitamins: { C: 18, B1: 0.3, B2: 0.2, Folate: 28 }, minerals: { iron: 2.1, magnesium: 45, calcium: 120 } },
    { meal_type: 'lunch', title: 'Demo: Kyllingesalat', calories: 520, protein: 42, carbs: 22, fat: 28, fiber: 6, vitamins: { A: 180, C: 35, B3: 8, B6: 0.6 }, minerals: { iron: 1.8, zinc: 2.2, potassium: 480 } },
    { meal_type: 'dinner', title: 'Demo: Laks og broccoli', calories: 610, protein: 38, carbs: 18, fat: 38, fiber: 7, vitamins: { D: 3.5, B12: 4.2, E: 3.1, K: 42 }, minerals: { selenium: 28, phosphor: 320, potassium: 620 } },
    { meal_type: 'snack', title: 'Demo: Æble og mandler', calories: 180, protein: 4, carbs: 22, fat: 9, fiber: 5, vitamins: { C: 6, E: 2.8 }, minerals: { magnesium: 38, calcium: 45 } },
  ],
  [
    { meal_type: 'breakfast', title: 'Demo: Skyr med müsli', calories: 340, protein: 28, carbs: 38, fat: 6, fiber: 4, vitamins: { B2: 0.5, B12: 1.1, D: 0.8 }, minerals: { calcium: 220, phosphor: 210, zinc: 1.4 } },
    { meal_type: 'lunch', title: 'Demo: Rugbrød med tun', calories: 480, protein: 32, carbs: 48, fat: 14, fiber: 7, vitamins: { B3: 9, B6: 0.5, Folate: 32 }, minerals: { iron: 2.4, sodium: 680, potassium: 340 } },
    { meal_type: 'dinner', title: 'Demo: Kødsovs og pasta', calories: 720, protein: 35, carbs: 82, fat: 24, fiber: 5, vitamins: { B1: 0.4, B12: 2.1, A: 90 }, minerals: { iron: 3.8, zinc: 4.5, magnesium: 52 } },
  ],
  [
    { meal_type: 'breakfast', title: 'Demo: Æggeomelet', calories: 410, protein: 26, carbs: 4, fat: 32, fiber: 1, vitamins: { A: 220, D: 2.2, B12: 1.8, K: 18 }, minerals: { iron: 2.6, selenium: 22, zinc: 2.1 } },
    { meal_type: 'lunch', title: 'Demo: Linsegryde', calories: 490, protein: 22, carbs: 62, fat: 12, fiber: 14, vitamins: { C: 12, B1: 0.5, B6: 0.7, Folate: 95 }, minerals: { iron: 4.2, magnesium: 78, potassium: 720 } },
    { meal_type: 'dinner', title: 'Demo: Kylling wok', calories: 580, protein: 40, carbs: 45, fat: 22, fiber: 6, vitamins: { C: 48, B3: 11, B6: 0.9 }, minerals: { iron: 2.2, zinc: 3.1, potassium: 540 } },
    { meal_type: 'snack', title: 'Demo: Banan', calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3, vitamins: { C: 10, B6: 0.4 }, minerals: { potassium: 420, magnesium: 32 } },
  ],
  [
    { meal_type: 'breakfast', title: 'Demo: Smoothie bowl', calories: 360, protein: 14, carbs: 52, fat: 10, fiber: 9, vitamins: { C: 42, A: 140, E: 2.2, Folate: 38 }, minerals: { iron: 1.6, calcium: 160, magnesium: 55 } },
    { meal_type: 'lunch', title: 'Demo: Tomatsuppe og brød', calories: 440, protein: 14, carbs: 58, fat: 16, fiber: 8, vitamins: { C: 28, A: 320, K: 22 }, minerals: { iron: 2.8, potassium: 680, sodium: 920 } },
    { meal_type: 'dinner', title: 'Demo: Bøf og salat', calories: 650, protein: 44, carbs: 12, fat: 46, fiber: 4, vitamins: { B12: 3.2, B3: 7, K: 35 }, minerals: { iron: 4.8, zinc: 6.2, selenium: 32 } },
  ],
  [
    { meal_type: 'breakfast', title: 'Demo: Risengrød', calories: 320, protein: 9, carbs: 58, fat: 5, fiber: 2, vitamins: { B1: 0.2, B2: 0.15, D: 1.2 }, minerals: { calcium: 180, phosphor: 140, iron: 1.2 } },
    { meal_type: 'lunch', title: 'Demo: Fiskefrikadeller', calories: 510, protein: 28, carbs: 35, fat: 26, fiber: 3, vitamins: { D: 4.8, B12: 3.5, B3: 5 }, minerals: { selenium: 24, iodine: 12, potassium: 380 } },
    { meal_type: 'dinner', title: 'Demo: Grøntsagslasagne', calories: 680, protein: 26, carbs: 72, fat: 28, fiber: 11, vitamins: { A: 280, C: 22, B6: 0.5, Folate: 48 }, minerals: { iron: 3.2, calcium: 280, magnesium: 62 } },
    { meal_type: 'snack', title: 'Demo: Nøddemix', calories: 195, protein: 6, carbs: 8, fat: 16, fiber: 3, vitamins: { E: 4.2, B1: 0.15 }, minerals: { magnesium: 48, zinc: 1.8, iron: 1.1 } },
  ],
  [
    { meal_type: 'breakfast', title: 'Demo: Fuldkornsbrød og ost', calories: 390, protein: 18, carbs: 42, fat: 16, fiber: 5, vitamins: { A: 95, B2: 0.35, B12: 1.4 }, minerals: { calcium: 320, phosphor: 260, sodium: 620 } },
    { meal_type: 'lunch', title: 'Demo: Quinoa bowl', calories: 530, protein: 20, carbs: 68, fat: 18, fiber: 12, vitamins: { C: 18, E: 2.5, Folate: 62, B6: 0.55 }, minerals: { iron: 3.6, magnesium: 95, potassium: 580 } },
    { meal_type: 'dinner', title: 'Demo: Kikærtecurry', calories: 590, protein: 22, carbs: 78, fat: 20, fiber: 15, vitamins: { C: 32, A: 160, K: 28, B6: 0.65 }, minerals: { iron: 4.5, zinc: 2.8, potassium: 820 } },
  ],
]

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function main(): Promise<void> {
  const confirm = process.argv.includes('--confirm')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: users, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (userErr) throw userErr
  const user = users.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
  if (!user) {
    console.error(`Bruger ikke fundet: ${EMAIL}`)
    process.exit(1)
  }

  const dates = Array.from({ length: DAYS }, (_, i) => addDays(LAST_MONDAY, i))
  const rows = dates.flatMap((logged_date, dayIdx) => {
    const plan = DAY_PLANS[dayIdx % DAY_PLANS.length]
    return plan.map((m) => ({
      user_id: user.id,
      logged_date,
      meal_type: m.meal_type,
      source: 'manual' as const,
      title: m.title,
      servings: 1,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      fiber: m.fiber,
      vitamins: m.vitamins,
      minerals: m.minerals,
    }))
  })

  const { count } = await supabase
    .from('food_log_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('logged_date', LAST_MONDAY)
    .lte('logged_date', addDays(LAST_MONDAY, 6))
    .like('title', 'Demo:%')

  console.log(`Bruger: ${EMAIL} (${user.id})`)
  console.log(`Uge: ${LAST_MONDAY} – ${addDays(LAST_MONDAY, 6)}`)
  console.log(`Eksisterende demo-rækker: ${count ?? 0}`)
  console.log(`Vil indsætte ${rows.length} måltider over ${DAYS} dage`)

  const weekKcal = rows.reduce((s, r) => s + Number(r.calories), 0)
  console.log(`Samlet demo-indtag: ~${Math.round(weekKcal).toLocaleString('da-DK')} kcal`)

  if (!confirm) {
    console.log('\nDry-run — kør med --confirm for at skrive.')
    return
  }

  const { error: delErr } = await supabase
    .from('food_log_entries')
    .delete()
    .eq('user_id', user.id)
    .gte('logged_date', LAST_MONDAY)
    .lte('logged_date', addDays(LAST_MONDAY, 6))
    .like('title', 'Demo:%')

  if (delErr) throw delErr

  const { error: insErr } = await supabase.from('food_log_entries').insert(rows)
  if (insErr) throw insErr

  console.log(`\n✓ ${rows.length} demo-måltider indsat for sidste uge.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
