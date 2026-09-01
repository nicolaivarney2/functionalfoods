/** Transient PostgREST / pooler errors after heavy writes or schema reloads. */

export function groceryDbErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}

export function isRetryableGroceryDbError(err: unknown): boolean {
  const msg = groceryDbErrorMessage(err)
  return /could not query the database for the schema cache|timeout|57014|canceling statement|upstream request|fetch failed|econnreset|503|502|pgrst002|pgrst003/i.test(
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
      if (!isRetryableGroceryDbError(err) || attempt === attempts - 1) throw err
      const wait = Math.min(maxWaitMs, 1000 * 2 ** attempt)
      console.warn(
        `[grocery] ${label} retry ${attempt + 1}/${attempts} in ${wait}ms: ${groceryDbErrorMessage(err)}`,
      )
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(groceryDbErrorMessage(lastError))
}
