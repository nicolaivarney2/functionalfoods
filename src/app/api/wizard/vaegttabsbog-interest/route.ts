import { NextRequest, NextResponse } from 'next/server'
import { subscribeEmailToLoops } from '@/lib/loops-subscribe'

/**
 * Interesseliste til trykt 6-ugers vægttabsbog (Loops). Kategori `vaegttabsbog` → LOOPS_MAILING_LIST_VAEGTTABSBOG eller default-liste.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim() : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'Ugyldig e-mail' }, { status: 400 })
    }

    const loopsKey = process.env.LOOPS_API_KEY?.trim()
    if (!loopsKey) {
      return NextResponse.json(
        { ok: false, error: 'Tilmelding er midlertidigt utilgængelig. Prøv igen senere.' },
        { status: 503 }
      )
    }

    const result = await subscribeEmailToLoops(email, 'vaegttabsbog', {
      source: 'Wizard – trykt 6-ugers vægttabsbog (interesseliste)',
    })

    if (!result.ok) {
      console.error('[wizard/vaegttabsbog-interest]', result.error)
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[wizard/vaegttabsbog-interest]', e)
    return NextResponse.json({ ok: false, error: 'Noget gik galt' }, { status: 500 })
  }
}
