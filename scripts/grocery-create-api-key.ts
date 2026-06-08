#!/usr/bin/env npx tsx
/**
 * Opret en ny Fooddata API-nøgle til eksterne konsumenter.
 *
 * Usage:
 *   npx tsx scripts/grocery-create-api-key.ts --name="Planomo prod"
 *   npx tsx scripts/grocery-create-api-key.ts --name="Test" --scopes=read
 *   npx tsx scripts/grocery-create-api-key.ts --name="Catalog only" --scopes=read:catalog
 *
 * Kræver GROCERY_SUPABASE_URL + GROCERY_SUPABASE_SECRET_KEY i env.
 * Nøglen vises KUN én gang — gem den sikkert.
 */

import { createHash, randomBytes } from 'crypto'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

const args = process.argv.slice(2)
const nameArg = args.find((a) => a.startsWith('--name='))
const scopesArg = args.find((a) => a.startsWith('--scopes='))

const name = nameArg?.split('=').slice(1).join('=').trim()
if (!name) {
  console.error('Usage: npx tsx scripts/grocery-create-api-key.ts --name="Consumer name" [--scopes=read]')
  process.exit(1)
}

const scopesRaw = scopesArg?.split('=')[1]?.trim() ?? 'read'
const allowed = new Set(['read', 'read:catalog', 'read:curation'])
const scopes = scopesRaw.split(',').map((s) => s.trim()).filter(Boolean)
for (const s of scopes) {
  if (!allowed.has(s)) {
    console.error(`Unknown scope: ${s}. Allowed: ${[...allowed].join(', ')}`)
    process.exit(1)
  }
}

const url = process.env.GROCERY_SUPABASE_URL
const key = process.env.GROCERY_SUPABASE_SECRET_KEY
if (!url || !key) {
  console.error('Missing GROCERY_SUPABASE_URL or GROCERY_SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const rawKey = `fd_${randomBytes(24).toString('base64url')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 12)

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
      active: true,
    })
    .select('id, name, scopes, created_at')
    .single()

  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log('\n✓ API key created\n')
  console.log(`  id:     ${data.id}`)
  console.log(`  name:   ${data.name}`)
  console.log(`  scopes: ${(data.scopes as string[]).join(', ')}`)
  console.log(`\n  KEY (save now — shown once):\n\n    ${rawKey}\n`)
  console.log('  Usage:\n')
  console.log(`    curl -H "Authorization: Bearer ${rawKey}" \\`)
  console.log('      https://<your-domain>/api/grocery/stores\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
