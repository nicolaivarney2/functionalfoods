#!/usr/bin/env node
/**
 * Verificer at .env.local findes og at ingen secret env-filer er tracked i git.
 * Kør: npm run env:check
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const envLocal = path.join(root, '.env.local')

let ok = true

// 1. .env.local skal findes lokalt
if (!fs.existsSync(envLocal)) {
  console.error('❌ .env.local mangler. Kør: npm run env:pull')
  ok = false
} else {
  console.log('✅ .env.local findes')
}

// 2. Ingen secret env-filer må være tracked
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
