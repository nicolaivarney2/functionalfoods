import { NextRequest, NextResponse } from 'next/server'
import { subscribeEmailToLoops } from '@/lib/loops-subscribe'

/**
 * Blog nyhedsbrev-widget → Loops (anbefalet) og/eller Zapier-webhook.
 * Loops: PUT /contacts/update med mailing list-id pr. kategori (samme automation som i Loops UI).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const category = typeof body?.newsletter_category === 'string' ? body.newsletter_category.trim() : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'Ugyldig e-mail' }, { status: 400 })
    }

    const loopsKey = process.env.LOOPS_API_KEY?.trim()
    if (loopsKey) {
      const result = await subscribeEmailToLoops(email, category)
      if (!result.ok) {
        console.error('[newsletter/subscribe] Loops:', result.error)
        return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
      }
    }

    const hook = process.env.NEWSLETTER_ZAPIER_WEBHOOK_URL?.trim()
    if (hook) {
      try {
        await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            newsletter_category: category,
            source: 'blog_newsletter_widget',
          }),
        })
      } catch (e) {
        console.error('[newsletter/subscribe] Zapier webhook:', e)
        if (loopsKey) {
          // Loops lykkedes — log Zapier men returnér stadig ok
        } else {
          return NextResponse.json({ ok: false, error: 'Kunne ikke gemme tilmelding' }, { status: 502 })
        }
      }
    }

    if (!loopsKey && !hook) {
      console.warn('[newsletter/subscribe] Hverken LOOPS_API_KEY eller NEWSLETTER_ZAPIER_WEBHOOK_URL — intet backend')
    }

    return NextResponse.json({ ok: true, loops: Boolean(loopsKey) })
  } catch (e) {
    console.error('[newsletter/subscribe]', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
