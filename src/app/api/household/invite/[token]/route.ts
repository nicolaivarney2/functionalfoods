import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Ugyldigt link' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const { data: invite } = await supabase
    .from('partner_invitations')
    .select('email, status, expires_at, owner_id')
    .eq('token', token)
    .maybeSingle()

  if (!invite || invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invitationen er ugyldig eller allerede brugt.' }, { status: 404 })
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await supabase.from('partner_invitations').update({ status: 'expired' }).eq('token', token)
    return NextResponse.json({ error: 'Invitationen er udløbet. Bed om et nyt link.' }, { status: 410 })
  }

  const { data: owner } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, email')
    .eq('id', invite.owner_id)
    .maybeSingle()

  const inviterName =
    [owner?.first_name, owner?.last_name].filter(Boolean).join(' ').trim() ||
    owner?.email?.split('@')[0] ||
    'Din partner'

  return NextResponse.json({
    email: invite.email,
    inviterName,
    expiresAt: invite.expires_at,
  })
}
