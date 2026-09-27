/**
 *   npx tsx scripts/trial-reminder.ts
 * Sender mailen dagen før prøven slutter. Kører også fra GitHub Actions.
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { runTrialReminders } from '../src/lib/trial-reminder'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key)
  const result = await runTrialReminders(supabase)
  console.log(result)
  if (!result.ok) process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
