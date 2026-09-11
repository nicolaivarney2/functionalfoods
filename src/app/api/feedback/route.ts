import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { sendTransactionalEmail } from '@/lib/send-transactional-email'

export const dynamic = 'force-dynamic'

const FEEDBACK_TO = 'nicolai@functionalfoods.dk'
const MAX_MESSAGE_LENGTH = 5000

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const message = sanitizeText(body.message ?? body.content ?? body.feedback, MAX_MESSAGE_LENGTH)
    if (!message) {
      return NextResponse.json({ error: 'Feedback må ikke være tom' }, { status: 400 })
    }

    const tag = sanitizeText(body.tag, 80)
    const source = sanitizeText(body.source, 200) || 'ukendt'
    const sourceScreen = sanitizeText(body.sourceScreen ?? body.screen, 200)
    const platform = sanitizeText(body.platform, 100)

    const user = await getAuthenticatedUser(request)
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
    const userName = sanitizeText(
      (metadata.name ?? metadata.full_name ?? metadata.display_name) as string | undefined,
      120,
    )
    const userEmail = user?.email ?? null

    const lines = [
      'Ny feedback fra Functional Foods',
      '',
      tag ? `Emne: ${tag}` : null,
      `Kilde: ${source}`,
      sourceScreen ? `Skærm: ${sourceScreen}` : null,
      platform ? `Platform: ${platform}` : null,
      '',
      user ? `Bruger: ${userName || 'Ukendt navn'} (${userEmail ?? user.id})` : 'Bruger: Ikke logget ind',
      '',
      '--- Feedback ---',
      message,
    ]

    const emailResult = await sendTransactionalEmail({
      to: process.env.FEEDBACK_TO_EMAIL?.trim() || FEEDBACK_TO,
      subject: `[FF feedback] ${tag || sourceScreen || 'App'}`,
      text: lines.filter((line) => line != null).join('\n'),
      replyTo: userEmail ?? undefined,
    })

    if (!emailResult.ok) {
      console.error('feedback email failed', emailResult.error)
      return NextResponse.json(
        { error: 'Kunne ikke sende feedback lige nu. Prøv igen senere.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST feedback error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
