import { NextResponse, type NextRequest } from 'next/server'

/**
 * Verifies the request is authorized to call the grocery API.
 *
 * Phase 1 (current): single shared bearer token via `GROCERY_INTERNAL_API_KEY`.
 *   Used by `functionalfoods` itself for server-side fetches.
 *
 * Phase 2 (planned): per-consumer keys via the `api_keys` table with SHA256
 *   hash lookup, scopes, and rate limits. Drop-in replacement here.
 *
 * Returns `null` on success, or a NextResponse with 401/500 to short-circuit
 * the route handler.
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const expected = process.env.GROCERY_INTERNAL_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: 'GROCERY_INTERNAL_API_KEY not configured on the server.' },
      { status: 500 },
    )
  }

  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
