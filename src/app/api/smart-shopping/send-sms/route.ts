import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendSmsDk } from '@/lib/sms-dk'

export const dynamic = 'force-dynamic'

function normalizeDkPhone(digits: string): string | null {
  const d = digits.replace(/\D/g, '')
  if (d.length === 8) return `+45${d}`
  if (d.startsWith('45') && d.length === 10) return `+${d}`
  if (d.startsWith('0045') && d.length === 12) return `+${d.slice(2)}`
  return null
}

async function getUser(supabaseUrl: string, serviceKey: string, request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) return user
  }
  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get: (n: string) => cookieStore.get(n)?.value,
      set: () => {},
      remove: () => {},
    },
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!error && user) return user
  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getUser(supabaseUrl, serviceKey, request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token, phoneDigits } = body as { token?: string; phoneDigits?: string }

    if (!token || !phoneDigits) {
      return NextResponse.json({ error: 'token og phoneDigits kræves' }, { status: 400 })
    }

    const toE164 = normalizeDkPhone(String(phoneDigits))
    if (!toE164) {
      return NextResponse.json({ error: 'Ugyldigt telefonnummer (8 cifre)' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: row, error: fetchErr } = await supabase
      .from('smart_shopping_links')
      .select('id, user_id, token')
      .eq('token', token)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Link ikke fundet' }, { status: 404 })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const url = `${origin.replace(/\/$/, '')}/indkob/${token}`
    const message = `Din indkøbsliste (Functional Foods): ${url}`

    const result = await sendSmsDk({ toE164, message })

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'SMS kunne ikke sendes' }, { status: 502 })
    }

    await supabase
      .from('smart_shopping_links')
      .update({
        sms_sent_at: new Date().toISOString(),
        sms_to: toE164,
      })
      .eq('id', row.id)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('send-sms', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
