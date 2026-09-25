/**
 *   npx tsx scripts/community-tick.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { runCommunityTick } from '../src/lib/community/actions'

async function main() {
  const result = await runCommunityTick()
  console.log(result)
  if (!result.ok) process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
