#!/usr/bin/env node
/**
 * Verificer at .env.local findes, at påkrævede nøgler er udfyldt,
 * og at ingen secret env-filer er tracked i git.
 * Kør: npm run env:check
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const envLocal = path.join(root, '.env.local')
const envOverride = path.join(root, '.env.local.override')

/** Keys scripts need; Vercel CLI often pulls these as empty "". */
const REQUIRED_FOR_FOODDATA = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'FF main Supabase URL'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'FF main Supabase anon key'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'FF main Supabase service role (scripts + admin)'],
  ['GROCERY_SUPABASE_URL', 'Fooddata / grocery Supabase URL'],
  ['GROCERY_SUPABASE_SECRET_KEY', 'Fooddata service role key'],
]

let ok = true

function loadEnvFile(filePath) {
  const map = new Map()
  if (!fs.existsSync(filePath)) return map
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2]
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    map.set(m[1], v)
  }
  return map
}

// 1. .env.local skal findes lokalt
if (!fs.existsSync(envLocal)) {
  console.error('❌ .env.local mangler. Kør: npm run env:pull')
  ok = false
} else {
  console.log('✅ .env.local findes')
}

// 2. Påkrævede nøgler (efter merge med override)
const merged = loadEnvFile(envLocal)
if (fs.existsSync(envOverride)) {
  for (const [k, v] of loadEnvFile(envOverride)) {
    if (v) merged.set(k, v)
  }
  console.log('✅ .env.local.override findes (merges ved env:pull)')
}

const missing = []
for (const [key, label] of REQUIRED_FOR_FOODDATA) {
  const value = merged.get(key)
  if (!value || value.length < 8) {
    missing.push({ key, label })
  }
}

if (missing.length > 0) {
  console.error('❌ Manglende eller tomme env-variabler (scripts fejler):')
  for (const { key, label } of missing) {
    console.error(`   - ${key}  (${label})`)
  }
  console.error('')
  console.error('Fix: Vercel CLI henter ofte service-role-nøgler som tomme "".')
  console.error('  1. Kopiér værdier fra Vercel → Settings → Environment Variables')
  console.error('     eller Supabase → Project Settings → API')
  console.error('  2. Opret .env.local.override med de rigtige værdier, fx:')
  console.error('     SUPABASE_SERVICE_ROLE_KEY=eyJ...')
  console.error('     GROCERY_SUPABASE_URL=https://xxx.supabase.co')
  console.error('     GROCERY_SUPABASE_SECRET_KEY=eyJ...')
  console.error('  3. Kør: npm run env:pull  (merger override ind)')
  console.error('  4. Kør: npm run env:check igen')
  ok = false
} else {
  console.log('✅ Fooddata + FF Supabase env-variabler er udfyldt')
}

// 3. Ingen secret env-filer må være tracked
let tracked = []
try {
  tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
} catch {
  console.warn('⚠️  Kunne ikke læse git ls-files (ikke et git repo?)')
  process.exit(ok ? 0 : 1)
}

const forbidden = tracked.filter(
  (f) =>
    /^\.env(\.local|\.production|\.development)?$/.test(f) ||
    /^\.env\.local\./.test(f) ||
    f === '.openai-config.json',
)

if (forbidden.length > 0) {
  console.error('❌ Secret env-filer er tracked i git (SKAL fjernes):')
  forbidden.forEach((f) => console.error(`   - ${f}`))
  console.error('   Kør: git rm --cached <fil>')
  ok = false
} else {
  console.log('✅ Ingen secret env-filer tracked i git')
}

process.exit(ok ? 0 : 1)
