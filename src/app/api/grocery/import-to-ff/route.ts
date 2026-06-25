/**
 * On-demand import: fooddata (GROCERY Supabase) → FF main DB.
 *
 * NOTE: This is NOT on a Vercel cron. The scheduled import runs daily via
 * GitHub Actions (.github/workflows/fooddata-import.yml), which runs the full
 * CLI import with no serverless timeout. This endpoint exists as a lightweight
 * MANUAL trigger to refresh products + offers without waiting for the nightly
 * GitHub run.
 *
 * Default: products + offers + match-queue. Price history is heavy (~11 min)
 * and is skipped by default — do NOT pass `?history=true` here, it will exceed
 * the 300s function limit. Use the GitHub Action for a full import with history.
 *
 * Auth: Bearer CRON_SECRET or Bearer GROCERY_SYNC_SECRET (also accepts the
 * `x-cron-secret` header for parity with the weekly-curation route).
 */

import { NextResponse } from 'next/server'
import { getGroceryServiceClient } from '@/grocery/db/client'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { runFooddataImport } from '@/lib/fooddata-import/run-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.replace(/^Bearer\s+/i, '')

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === cronSecret) return true

  const manualSecret = process.env.GROCERY_SYNC_SECRET
  if (manualSecret && bearer === manualSecret) return true

  // Fallback header (matches weekly-curation route) for manual GitHub triggers.
  const headerSecret = request.headers.get('x-cron-secret')
  if (cronSecret && headerSecret === cronSecret) return true

  return false
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const includeHistory = url.searchParams.get('history') === 'true'
  const dryRun = url.searchParams.get('dryRun') === 'true'

  const startedAt = new Date()
  const logs: string[] = []

  try {
    const ff = createSupabaseServiceClient()
    const fooddata = getGroceryServiceClient()

    const result = await runFooddataImport({
      ff,
      fooddata,
      dryRun,
      skipHistory: !includeHistory,
      log: (msg) => logs.push(msg),
    })

    return NextResponse.json({
      success: true,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      includeHistory,
      dryRun,
      result,
      logs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[grocery/import-to-ff] failed:', message)
    return NextResponse.json(
      {
        success: false,
        error: message,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        logs,
      },
      { status: 500 },
    )
  }
}
