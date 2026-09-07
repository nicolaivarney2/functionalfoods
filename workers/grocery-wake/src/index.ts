/**
 * Punctual wake for grocery GitHub Actions (GitHub `schedule:` is often 4h late).
 *
 * Crons are UTC:
 *   01:00 — Goma (no import; scrape follows at 02:00)
 *   02:00 — native scrape → workflow kicks fooddata-import
 *   14:00 — Goma + followup import
 *
 * Secrets (wrangler secret put):
 *   GITHUB_TOKEN  PAT with `repo` + `workflow` (or fine-grained: Actions write)
 * Vars:
 *   GITHUB_REPO   nicolaivarney2/functionalfoods
 *   GITHUB_REF    main
 */

export interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  GITHUB_REF: string
  WAKE_SECRET?: string
}

const GOMA = 'goma-scheduled-sync.yml'
const NATIVE = 'grocery-native-sync.yml'

export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const cron = controller.cron
    if (cron === '0 1 * * *') {
      await dispatch(env, GOMA, { followup_import: false })
      return
    }
    if (cron === '0 2 * * *') {
      await dispatch(env, NATIVE, {})
      return
    }
    if (cron === '0 14 * * *') {
      await dispatch(env, GOMA, { followup_import: true })
      return
    }
    throw new Error(`Unknown cron: ${cron}`)
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Use POST ?cron=0+2+*+*+*', { status: 405 })
    }
    const secret = env.WAKE_SECRET
    if (!secret) {
      return new Response('WAKE_SECRET not set', { status: 503 })
    }
    const auth = request.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
    const url = new URL(request.url)
    const cron = (url.searchParams.get('cron') ?? '').replace(/\+/g, ' ')
    const fake = {
      cron,
      scheduledTime: Date.now(),
      noRetry() {},
    } as ScheduledController
    await this.scheduled(fake, env)
    return new Response(`dispatched for cron ${cron}\n`, { status: 200 })
  },
}

async function dispatch(
  env: Env,
  workflow: string,
  inputs: Record<string, boolean>,
): Promise<void> {
  if (!env.GITHUB_TOKEN) throw new Error('Missing GITHUB_TOKEN')
  const repo = env.GITHUB_REPO || 'nicolaivarney2/functionalfoods'
  const ref = env.GITHUB_REF || 'main'
  const body: { ref: string; inputs?: Record<string, string> } = { ref }
  if (Object.keys(inputs).length > 0) {
    body.inputs = Object.fromEntries(
      Object.entries(inputs).map(([k, v]) => [k, v ? 'true' : 'false']),
    )
  }
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'functionalfoods-grocery-wake',
      },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub ${workflow} ${res.status}: ${text}`)
  }
}
