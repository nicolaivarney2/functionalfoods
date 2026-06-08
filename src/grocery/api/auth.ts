import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getGroceryServiceClient } from '@/grocery/db/client'

export type GroceryApiScope = 'read:catalog' | 'read:curation'

const ALL_SCOPES: GroceryApiScope[] = ['read:catalog', 'read:curation']

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden(scope: GroceryApiScope): NextResponse {
  return NextResponse.json({ error: `Missing scope: ${scope}` }, { status: 403 })
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization') ?? ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

function hasScope(scopes: string[] | null | undefined, required: GroceryApiScope): boolean {
  if (!scopes?.length) return false
  if (scopes.includes('read')) return true
  return scopes.includes(required)
}

async function validateDbKey(
  token: string,
  requiredScope: GroceryApiScope,
): Promise<NextResponse | null> {
  const hash = createHash('sha256').update(token).digest('hex')
  const supabase = getGroceryServiceClient()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, scopes, active, expires_at')
    .eq('key_hash', hash)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return unauthorized()
  if (data.expires_at && new Date(data.expires_at) < new Date()) return unauthorized()
  if (!hasScope(data.scopes, requiredScope)) return forbidden(requiredScope)

  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return null
}

/**
 * Verifies the request is authorized to call the grocery/fooddata API.
 *
 * Accepts:
 * - `GROCERY_INTERNAL_API_KEY` (master key, all scopes)
 * - Per-consumer keys in `api_keys` (SHA256 hash lookup, scoped)
 *
 * Returns `null` on success, or a NextResponse with 401/403/500 to short-circuit.
 */
export async function requireApiKey(
  request: NextRequest,
  requiredScope: GroceryApiScope = 'read:catalog',
): Promise<NextResponse | null> {
  const token = extractBearerToken(request)
  if (!token) return unauthorized()

  const internal = process.env.GROCERY_INTERNAL_API_KEY
  if (internal && safeEqual(token, internal)) return null

  return validateDbKey(token, requiredScope)
}

/** Master key only — used by sync endpoints that must not be consumer-scoped. */
export function requireInternalApiKey(request: NextRequest): NextResponse | null {
  const token = extractBearerToken(request)
  if (!token) return unauthorized()

  const expected = process.env.GROCERY_INTERNAL_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: 'GROCERY_INTERNAL_API_KEY not configured on the server.' },
      { status: 500 },
    )
  }

  if (!safeEqual(token, expected)) return unauthorized()
  return null
}

export { ALL_SCOPES }
