import { NextResponse, type NextRequest } from 'next/server'
import { syncSallingChain } from '@/grocery/adapters/salling-algolia'
import type { SallingChain } from '@/grocery/adapters/salling-algolia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALID_CHAINS: SallingChain[] = ['netto', 'bilka', 'foetex']

/**
 * Trigger a Salling Group (Netto/Bilka/Føtex) sync.
 *
 * Query params:
 *   - chain: 'netto' | 'bilka' | 'foetex' (required)
 *   - dryRun: 'true' (optional, default false)
 *   - max: max number of products (optional, default unlimited)
 *
 * Auth: requires SYNC_SECRET in Authorization header to prevent random hits.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') || ''
  const expected = process.env.GROCERY_SYNC_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'GROCERY_SYNC_SECRET not configured on the server.' },
      { status: 500 },
    )
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const chain = searchParams.get('chain') as SallingChain | null
  if (!chain || !VALID_CHAINS.includes(chain)) {
    return NextResponse.json(
      { error: `chain must be one of ${VALID_CHAINS.join(', ')}` },
      { status: 400 },
    )
  }

  const dryRun = searchParams.get('dryRun') === 'true'
  const maxRaw = searchParams.get('max')
  const maxProducts = maxRaw ? Math.max(1, Number.parseInt(maxRaw, 10)) : undefined

  try {
    const result = await syncSallingChain(chain, { dryRun, maxProducts })
    return NextResponse.json(result, {
      status: result.status === 'failed' ? 500 : 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Sync failed unexpectedly', message },
      { status: 500 },
    )
  }
}

/** Convenience: GET behaves like POST so it's easy to trigger from a browser during dev. */
export async function GET(request: NextRequest) {
  return POST(request)
}
