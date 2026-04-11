import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth-from-request'

export const dynamic = 'force-dynamic'

const TOKEN_TTL_MS = 15 * 60 * 1000

/**
 * Logget ind: generér m.me-URL med engangstoken (ref=ff_link--…) til ManyChat-kobling.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pageId = process.env.NEXT_PUBLIC_MESSENGER_PAGE_ID?.trim()
  if (!pageId) {
    return NextResponse.json({ error: 'Messenger ikke konfigureret' }, { status: 503 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey)

  const fallbackUrl = `https://m.me/${pageId}?ref=ff_logged_in`

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

  await supabase.from('messenger_link_tokens').delete().eq('user_id', user.id)

  const { error } = await supabase.from('messenger_link_tokens').insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  })

  if (error) {
    console.error('messenger_link_tokens insert', error)
    return NextResponse.json({ url: fallbackUrl, tokenless: true })
  }

  return NextResponse.json({
    url: `https://m.me/${pageId}?ref=ff_link--${token}`,
    expiresAt,
  })
}
