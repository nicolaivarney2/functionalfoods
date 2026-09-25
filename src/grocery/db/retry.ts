/** Transient PostgREST / pooler errors after heavy writes or schema reloads. */

function rawErrorText(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    if ('message' in err && (err as { message: unknown }).message != null) {
      return String((err as { message: unknown }).message)
    }
    try {
      return JSON.stringify(err)
    } catch {
      return Object.prototype.toString.call(err)
    }
  }
  return String(err)
}

/** Cloudflare HTML error pages are useless in cron JSON — keep host + status. */
export function sanitizeGatewayErrorMessage(message: string): string {
  if (!/<\s*!DOCTYPE html|<\s*html[\s>]|cf-error-details|Error code 52[0-5]/i.test(message)) {
    return message
  }
  const code =
    message.match(/Error code\s+(\d{3})/i)?.[1] ??
    message.match(/\b(52[0-5])\b/)?.[1] ??
    '5xx'
  const host = message.match(/([a-z0-9-]+\.supabase\.co)/i)?.[1]
  return host ? `Cloudflare ${code} from ${host}` : `Cloudflare ${code}`
}

export function groceryDbErrorMessage(err: unknown): string {
  return sanitizeGatewayErrorMessage(rawErrorText(err))
}

export function isTransientGatewayError(err: unknown): boolean {
  const msg = groceryDbErrorMessage(err)
  return /cloudflare|error code 52[0-5]|web server is returning an unknown error/i.test(msg)
}

export function isRetryableGroceryDbError(err: unknown): boolean {
  const msg = groceryDbErrorMessage(err)
  if (isTransientGatewayError(err)) return true
  return /could not query the database for the schema cache|timeout|57014|canceling statement|upstream request|fetch failed|econnreset|504|503|502|pgrst002|pgrst003/i.test(
    msg,
  )
}

export async function retryGroceryDb<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { attempts?: number; maxWaitMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? 8
  const maxWaitMs = options?.maxWaitMs ?? 30_000
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isRetryableGroceryDbError(err) || attempt === attempts - 1) {
        throw err instanceof Error ? err : new Error(groceryDbErrorMessage(err))
      }
      const wait = Math.min(maxWaitMs, 1000 * 2 ** attempt)
      console.warn(
        `[grocery] ${label} retry ${attempt + 1}/${attempts} in ${wait}ms: ${groceryDbErrorMessage(err)}`,
      )
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(groceryDbErrorMessage(lastError))
}
