#!/usr/bin/env node
/**
 * Generér Apple OAuth client secret (JWT) til Supabase → Authentication → Apple → Secret Key.
 *
 * Kræver .p8-fil fra Apple Developer → Keys (downloades kun én gang).
 *
 * Eksempel:
 *   node scripts/generate-apple-oauth-secret.js \
 *     --p8 ~/Downloads/AuthKey_Z882RP8D5K.p8 \
 *     --key-id Z882RP8D5K \
 *     --team-id B2ZPNXXNR5 \
 *     --client-id dk.functionalfoods.web
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

function parseArgs(argv) {
  const out = {}
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '')
    const value = argv[i + 1]
    if (key && value) out[key] = value
  }
  return out
}

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

function generateAppleClientSecret({ p8Path, keyId, teamId, clientId, days = 180 }) {
  const resolved = path.resolve(p8Path.replace(/^~/, process.env.HOME || ''))
  const privateKey = fs.readFileSync(resolved, 'utf8')

  const now = Math.floor(Date.now() / 1000)
  const maxDays = Math.min(Number(days) || 180, 180)
  const exp = now + maxDays * 24 * 60 * 60

  const header = { alg: 'ES256', kid: keyId }
  const payload = {
    iss: teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  }

  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  })

  return {
    secret: `${signingInput}.${signature.toString('base64url')}`,
    expiresAt: new Date(exp * 1000).toISOString().slice(0, 10),
  }
}

const args = parseArgs(process.argv)

if (!args.p8 || !args['key-id'] || !args['team-id'] || !args['client-id']) {
  console.error(`
Brug:
  node scripts/generate-apple-oauth-secret.js \\
    --p8 /sti/til/AuthKey_XXXXX.p8 \\
    --key-id Z882RP8D5K \\
    --team-id B2ZPNXXNR5 \\
    --client-id dk.functionalfoods.web

Output er JWT-strengen du indsætter i Supabase → Apple → Secret Key.
JWT udløber efter max 180 dage (Apple-krav).
`)
  process.exit(1)
}

try {
  const { secret, expiresAt } = generateAppleClientSecret({
    p8Path: args.p8,
    keyId: args['key-id'],
    teamId: args['team-id'],
    clientId: args['client-id'],
    days: args.days,
  })

  console.log('\nKopiér hele linjen nedenfor ind i Supabase → Authentication → Providers → Apple → Secret Key:\n')
  console.log(secret)
  console.log(`\nUdløber ca.: ${expiresAt} — sæt påmindelse i kalenderen.\n`)
} catch (err) {
  console.error('Kunne ikke generere secret:', err.message)
  process.exit(1)
}
