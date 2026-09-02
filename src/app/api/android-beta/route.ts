import { NextRequest, NextResponse } from 'next/server'

import { sendTransactionalEmail } from '@/lib/send-transactional-email'

export const dynamic = 'force-dynamic'

const BETA_TO = 'nicolai@functionalfoods.dk'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 200

function sanitizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, MAX_EMAIL_LENGTH).toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = sanitizeEmail(body?.email)

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Ugyldig e-mail' }, { status: 400 })
    }

    const referer = request.headers.get('referer')
    const userAgent = request.headers.get('user-agent')

    const text = [
      'Ny Android-beta tilmelding fra functionalfoods.dk',
      '',
      `E-mail: ${email}`,
      referer ? `Side: ${referer}` : null,
      userAgent ? `User-Agent: ${userAgent}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await sendTransactionalEmail({
      to: process.env.FEEDBACK_TO_EMAIL?.trim() || BETA_TO,
      subject: `[FF Android-beta] ${email}`,
      text,
      replyTo: email,
    })

    if (!result.ok) {
      console.error('android-beta email failed', result.error)
      return NextResponse.json(
        { ok: false, error: 'Kunne ikke sende lige nu. Prøv igen senere.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/android-beta', e)
    return NextResponse.json({ ok: false, error: 'Noget gik galt' }, { status: 500 })
  }
}
