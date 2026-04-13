/**
 * Server-side Loops (loops.so) — API-nøgle må kun bruges her, ikke i browseren.
 * @see https://loops.so/docs/api-reference/update-contact
 */

const LOOPS_BASE = 'https://app.loops.so/api/v1'

/** Matcher audienceTag / kategori-slugs fra newsletter-variants + blog */
const LIST_ENV_BY_CATEGORY: Record<string, string> = {
  keto: 'LOOPS_MAILING_LIST_KETO',
  sense: 'LOOPS_MAILING_LIST_SENSE',
  mentalt: 'LOOPS_MAILING_LIST_MENTALT',
  'glp-1': 'LOOPS_MAILING_LIST_GLP_1',
  flexitarian: 'LOOPS_MAILING_LIST_FLEXITARIAN',
  familie: 'LOOPS_MAILING_LIST_FAMILIE',
  'anti-inflammatory': 'LOOPS_MAILING_LIST_ANTI_INFLAMMATORY',
  '5-2-diet': 'LOOPS_MAILING_LIST_5_2_DIET',
  'proteinrig-kost': 'LOOPS_MAILING_LIST_PROTEINRIG_KOST',
  vaegttabsbog: 'LOOPS_MAILING_LIST_VAEGTTABSBOG',
  functionalfoods: 'LOOPS_MAILING_LIST_DEFAULT',
}

/**
 * Finder mailing list-id fra env (samme ID som i Loops → Audience → Mailing lists).
 */
export function resolveLoopsMailingListId(newsletterCategory: string): string | null {
  const env = process.env
  const key = (newsletterCategory || '').trim().toLowerCase()
  if (!key) return env.LOOPS_MAILING_LIST_DEFAULT?.trim() || null

  const envVarName = LIST_ENV_BY_CATEGORY[key]
  if (envVarName) {
    const v = env[envVarName]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }

  return env.LOOPS_MAILING_LIST_DEFAULT?.trim() || null
}

export type LoopsSubscribeResult = { ok: true } | { ok: false; error: string }

export type SubscribeToLoopsOptions = {
  /** Vises som kilde på kontakten i Loops (standard: blog-widget). */
  source?: string
}

/**
 * Opret eller opdatér kontakt i Loops og tilføj til relevant mailing list (automation).
 */
export async function subscribeEmailToLoops(
  email: string,
  newsletterCategory: string,
  options?: SubscribeToLoopsOptions
): Promise<LoopsSubscribeResult> {
  const apiKey = process.env.LOOPS_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, error: 'LOOPS_API_KEY er ikke sat' }
  }

  const listId = resolveLoopsMailingListId(newsletterCategory)
  const body: Record<string, unknown> = {
    email,
    source: options?.source?.trim() || 'FunctionalFoods blog',
  }

  if (listId) {
    body.mailingLists = { [listId]: true }
  }

  const res = await fetch(`${LOOPS_BASE}/contacts/update`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string }

  if (res.status === 429) {
    return { ok: false, error: 'Loops rate limit — prøv igen om lidt' }
  }

  if (!res.ok) {
    const msg = data?.message || res.statusText || 'Loops fejl'
    return { ok: false, error: msg }
  }

  if (data.success === false) {
    return { ok: false, error: data.message || 'Loops afviste anmodningen' }
  }

  return { ok: true }
}
