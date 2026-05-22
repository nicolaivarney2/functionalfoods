/**
 * Grocery migrations runner.
 * ──────────────────────────
 * Applies any SQL files in src/grocery/db/migrations/ that haven't been
 * recorded in the `_grocery_migrations` ledger table yet. Idempotent.
 *
 * Connection: uses GROCERY_DATABASE_URL (preferred) or constructs it from
 * GROCERY_SUPABASE_URL + GROCERY_SUPABASE_DB_PASSWORD.
 *
 * Usage:
 *   npx tsx scripts/grocery-migrate.ts             # apply pending
 *   npx tsx scripts/grocery-migrate.ts --status    # list applied/pending
 *   npx tsx scripts/grocery-migrate.ts --dry-run   # show what would run
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Client } from 'pg'

const MIGRATIONS_DIR = join(process.cwd(), 'src/grocery/db/migrations')
const LEDGER_TABLE = '_grocery_migrations'

const LEDGER_DDL = `
  CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
    id            TEXT PRIMARY KEY,
    applied_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum      TEXT NOT NULL,
    duration_ms   INT
  );
`

export interface MigrationFile {
  id: string // e.g. "001_initial_schema"
  filename: string
  body: string
  checksum: string
}

function sha256(input: string): string {
  // Tiny sync hash — we don't need crypto-strength, only change detection.
  let hash = 0xcafebabe
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export function discoverMigrations(): MigrationFile[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  return files.map((filename) => {
    const id = filename.replace(/\.sql$/, '')
    const body = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
    return { id, filename, body, checksum: sha256(body) }
  })
}

export function buildConnectionString(): string {
  const explicit = process.env.GROCERY_DATABASE_URL
  if (explicit) return explicit

  const supabaseUrl = process.env.GROCERY_SUPABASE_URL
  const dbPassword = process.env.GROCERY_SUPABASE_DB_PASSWORD
  if (!supabaseUrl || !dbPassword) {
    throw new Error(
      'Missing GROCERY_DATABASE_URL or (GROCERY_SUPABASE_URL + GROCERY_SUPABASE_DB_PASSWORD).\n' +
        '  Find DB password in Supabase Dashboard → Project Settings → Database → Database password.\n' +
        '  Or copy a full connection string from Settings → Database → Connection string (URI).',
    )
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  // Default to Supabase pooler region "eu-central-1" (Frankfurt). Override with GROCERY_SUPABASE_REGION.
  const region = process.env.GROCERY_SUPABASE_REGION ?? 'eu-central-1'
  const encodedPw = encodeURIComponent(dbPassword)
  // Use transaction-mode pooler on port 6543 for short-lived sessions.
  return `postgresql://postgres.${projectRef}:${encodedPw}@aws-0-${region}.pooler.supabase.com:6543/postgres`
}

export interface RunOptions {
  dryRun?: boolean
  statusOnly?: boolean
}

export interface RunResult {
  applied: Array<{ id: string; durationMs: number }>
  pending: string[]
  alreadyApplied: string[]
  skipped: Array<{ id: string; reason: string }>
}

export async function runMigrations(options: RunOptions = {}): Promise<RunResult> {
  const migrations = discoverMigrations()
  const client = new Client({ connectionString: buildConnectionString() })
  await client.connect()

  try {
    await client.query(LEDGER_DDL)
    const { rows } = await client.query<{ id: string; checksum: string }>(
      `SELECT id, checksum FROM ${LEDGER_TABLE} ORDER BY applied_at`,
    )
    const appliedChecksumsById = new Map(rows.map((r) => [r.id, r.checksum]))

    const result: RunResult = {
      applied: [],
      pending: [],
      alreadyApplied: [],
      skipped: [],
    }

    for (const m of migrations) {
      const recordedChecksum = appliedChecksumsById.get(m.id)
      if (recordedChecksum) {
        if (recordedChecksum !== m.checksum) {
          result.skipped.push({
            id: m.id,
            reason: `Checksum mismatch (recorded=${recordedChecksum}, current=${m.checksum}) — file edited after apply.`,
          })
        } else {
          result.alreadyApplied.push(m.id)
        }
        continue
      }
      result.pending.push(m.id)
    }

    if (options.statusOnly) return result

    for (const id of result.pending) {
      const m = migrations.find((x) => x.id === id)!
      if (options.dryRun) {
        process.stdout.write(`  [dry] would apply: ${m.id}\n`)
        continue
      }

      process.stdout.write(`  → applying ${m.id} ... `)
      const start = Date.now()
      await client.query('BEGIN')
      try {
        await client.query(m.body)
        const durationMs = Date.now() - start
        await client.query(
          `INSERT INTO ${LEDGER_TABLE} (id, checksum, duration_ms) VALUES ($1, $2, $3)`,
          [m.id, m.checksum, durationMs],
        )
        await client.query('COMMIT')
        result.applied.push({ id: m.id, durationMs })
        process.stdout.write(`✓ ${durationMs}ms\n`)
      } catch (err) {
        await client.query('ROLLBACK')
        const message = err instanceof Error ? err.message : String(err)
        process.stdout.write(`✗\n`)
        throw new Error(`Migration ${m.id} failed: ${message}`)
      }
    }

    return result
  } finally {
    await client.end()
  }
}
