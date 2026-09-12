/**
 * Opretter/publicerer Loops-transactional "Partner invitation" hvis den mangler.
 *   npx tsx scripts/loops-ensure-partner-invite.ts
 */
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true })

const HOST = 'app.loops.so'
const NAME = 'Partner invitation'

type Json = Record<string, unknown>

async function loops(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: Json }> {
  const key = process.env.LOOPS_API_KEY?.trim()
  if (!key) throw new Error('LOOPS_API_KEY mangler i .env.local')

  const res = await fetch(`https://${HOST}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data: Json = {}
  try {
    data = text ? (JSON.parse(text) as Json) : {}
  } catch {
    data = { raw: text }
  }
  return { status: res.status, data }
}

const LMX = `
<Style backgroundColor="#ffffff" textBaseColor="#1a1a1a" />
<Section>
  <Paragraph>
    <Text>{data.inviterName} har inviteret dig som partner-bruger til {data.inviterName}.</Text>
  </Paragraph>
  <Paragraph>
    <Text>Du kan se samme madplan, men har din egen madlog. Din bruger er gratis og koblet op på {data.inviterName}.</Text>
  </Paragraph>
  <Button href="{data.inviteUrl}">Opret dig her</Button>
  <Paragraph>
    <Text>Linket virker i 14 dage. Du kan også kopiere det: {data.inviteUrl}</Text>
  </Paragraph>
</Section>
`.trim()

async function main() {
  const listed = await loops('GET', '/transactional-emails?perPage=50')
  if (listed.status >= 400) {
    console.error('Liste fejlede', listed.status, listed.data.message || listed.data)
    process.exit(1)
  }

  const items = (listed.data.data as Json[] | undefined) ?? []
  let transactionalId = String(items.find((item) => String(item.name || '') === NAME)?.id || '')

  if (!transactionalId) {
    const created = await loops('POST', '/transactional-emails', { name: NAME })
    if (created.status >= 400) {
      console.error('Create fejlede', created.status, created.data.message || created.data)
      process.exit(1)
    }
    transactionalId = String(created.data.id || '')
  }

  const current = await loops('GET', `/transactional-emails/${transactionalId}`)
  if (current.status >= 400) {
    console.error('Get fejlede', current.status, current.data.message || current.data)
    process.exit(1)
  }

  if (current.data.publishedEmailMessageId && !current.data.draftEmailMessageId) {
    console.log('exists', transactionalId)
    return
  }

  let draftId = String(current.data.draftEmailMessageId || '')
  let revisionId = String(current.data.draftEmailMessageContentRevisionId || '')

  if (!draftId || !revisionId) {
    const draft = await loops('POST', `/transactional-emails/${transactionalId}/draft`)
    if (draft.status >= 400) {
      console.error('Draft fejlede', draft.status, draft.data.message || draft.data)
      process.exit(1)
    }
    draftId = String(draft.data.draftEmailMessageId || '')
    revisionId = String(draft.data.draftEmailMessageContentRevisionId || '')
  }

  if (!draftId || !revisionId) {
    const msg = await loops('GET', `/email-messages/${String(current.data.draftEmailMessageId || '')}`)
    draftId = String(current.data.draftEmailMessageId || '')
    revisionId = String(msg.data.contentRevisionId || msg.data.draftEmailMessageContentRevisionId || '')
  }

  if (!draftId || !revisionId) {
    const msg = await loops('GET', `/email-messages/${draftId}`)
    revisionId = String(msg.data.contentRevisionId || '')
  }

  if (!draftId || !revisionId) {
    console.error('Mangler draft/revision', { draftId, revisionId, keys: Object.keys(current.data) })
    process.exit(1)
  }

  const updated = await loops('POST', `/email-messages/${draftId}`, {
    expectedRevisionId: revisionId,
    subject: '{data.inviterName} inviterer dig til Functional Foods',
    previewText: 'Du er partner-bruger. Samme madplan, din egen madlog. Gratis.',
    fromName: 'Functional Foods',
    fromEmail: 'hej',
    replyToEmail: 'nicolai@functionalfoods.dk',
    lmx: LMX,
  })
  if (updated.status >= 400) {
    console.error('Update fejlede', updated.status, updated.data.message || updated.data)
    process.exit(1)
  }

  const published = await loops('POST', `/transactional-emails/${transactionalId}/publish`)
  if (published.status >= 400) {
    console.error('Publish fejlede', published.status, published.data.message || published.data)
    process.exit(1)
  }

  console.log('created', transactionalId)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
