#!/usr/bin/env node
/**
 * Merge .env.local.override into .env.local (override wins on duplicate keys).
 * Kør automatisk efter `npm run env:pull`.
 */

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const basePath = path.join(root, '.env.local')
const overridePath = path.join(root, '.env.local.override')

if (!fs.existsSync(overridePath)) {
  process.exit(0)
}

function parseEnv(content) {
  const map = new Map()
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) map.set(m[1], m[2])
  }
  return { map }
}

const base = fs.existsSync(basePath)
  ? parseEnv(fs.readFileSync(basePath, 'utf8'))
  : { map: new Map() }

const override = parseEnv(fs.readFileSync(overridePath, 'utf8'))

let merged = 0
for (const [key, value] of override.map) {
  if (value === '') continue
  base.map.set(key, value)
  merged++
}

const out = [...base.map.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}=${v}`)
  .join('\n')
  .concat('\n')

fs.writeFileSync(basePath, out, { mode: 0o600 })
console.log(`✅ Merged ${merged} non-empty key(s) from .env.local.override into .env.local`)
