#!/usr/bin/env node
/**
 * Safe env pull: backup first, never overwrite non-empty values with empty "".
 *
 * Vercel CLI often writes encrypted secrets as empty strings. This script
 * preserves your existing .env.local values when the pull returns blanks.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const envLocal = path.join(root, '.env.local')
const envOverride = path.join(root, '.env.local.override')
const vercelPulled = path.join(root, '.env.vercel.pulled')

function parseEnv(content) {
  const map = new Map()
  const order = []
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2]
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!map.has(m[1])) order.push(m[1])
    map.set(m[1], v)
  }
  return { map, order }
}

function isNonempty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function serialize(map, keyOrder) {
  const keys = [...new Set([...keyOrder, ...map.keys()])].sort()
  return keys.map((k) => `${k}=${map.get(k) ?? ''}`).join('\n').concat('\n')
}

// 1. Backup existing .env.local
if (fs.existsSync(envLocal)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backup = path.join(root, `.env.local.backup.${stamp}`)
  fs.copyFileSync(envLocal, backup)
  console.log(`📦 Backup: ${path.basename(backup)}`)
}

// 2. Pull from Vercel into temp file (not .env.local directly)
console.log('⬇️  Pulling production env from Vercel…')
execSync(
  `npx vercel env pull "${vercelPulled}" --environment=production --yes`,
  { cwd: root, stdio: 'inherit' }
)

const existing = fs.existsSync(envLocal)
  ? parseEnv(fs.readFileSync(envLocal, 'utf8'))
  : { map: new Map(), order: [] }
const pulled = parseEnv(fs.readFileSync(vercelPulled, 'utf8'))

let updated = 0
let preserved = 0
let skippedEmpty = 0

for (const [key, pulledValue] of pulled.map) {
  const current = existing.map.get(key)
  if (isNonempty(pulledValue)) {
    if (current !== pulledValue) updated++
    existing.map.set(key, pulledValue)
    if (!existing.order.includes(key)) existing.order.push(key)
  } else if (isNonempty(current)) {
    preserved++
  } else {
    skippedEmpty++
    if (!existing.map.has(key)) {
      existing.map.set(key, '')
      existing.order.push(key)
    }
  }
}

// 3. Merge .env.local.override (non-empty wins)
let overrideMerged = 0
if (fs.existsSync(envOverride)) {
  const override = parseEnv(fs.readFileSync(envOverride, 'utf8'))
  for (const [key, value] of override.map) {
    if (!isNonempty(value)) continue
    existing.map.set(key, value)
    if (!existing.order.includes(key)) existing.order.push(key)
    overrideMerged++
  }
}

fs.writeFileSync(envLocal, serialize(existing.map, existing.order), { mode: 0o600 })
try {
  fs.unlinkSync(vercelPulled)
} catch {
  /* ignore */
}

console.log('')
console.log(`✅ .env.local updated safely`)
console.log(`   ${updated} key(s) updated from Vercel`)
console.log(`   ${preserved} non-empty value(s) preserved (Vercel returned empty)`)
console.log(`   ${skippedEmpty} key(s) still empty — copy from Vercel dashboard if needed`)
if (overrideMerged > 0) {
  console.log(`   ${overrideMerged} key(s) merged from .env.local.override`)
}
