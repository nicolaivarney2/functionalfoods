import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { ownerHasPartner, userHasHouseholdData } from '@/lib/partner-invite'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token) return NextResponse.json({ error: 'Mangler invitations-token.' }, { status: 400 })

  const supabase = createSupabaseServiceClient()
  const { data: invite } = await supabase
    .from('partner_invitations')
    .select('id, email, status, expires_at, owner_id')
    .eq('token', token)
    .maybeSingle()

  if (!invite || invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invitationen er ugyldig eller allerede brugt.' }, { status: 404 })
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await supabase.from('partner_invitations').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Invitationen er udløbet.' }, { status: 410 })
  }

  if (user.id === invite.owner_id) {
    return NextResponse.json({ error: 'Du kan ikke acceptere din egen invitation.' }, { status: 400 })
  }

  const userEmail = (user.email || '').trim().toLowerCase()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('account_kind, linked_owner_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.account_kind === 'partner') {
    if (profile.linked_owner_id === invite.owner_id) {
      return NextResponse.json({ success: true, already: true })
    }
    return NextResponse.json({ error: 'Kontoen er allerede partner på en anden husstand.' }, { status: 409 })
  }

  if (await userHasHouseholdData(supabase, user.id)) {
    return NextResponse.json(
      {
        error:
          'Denne konto har allerede sin egen madplan. Partneren skal oprette en ny, tom konto via invitationslinket.',
      },
      { status: 409 }
    )
  }

  if (await ownerHasPartner(supabase, invite.owner_id)) {
    return NextResponse.json({ error: 'Husstanden har allerede en partner.' }, { status: 409 })
  }

  const write = profile
    ? await supabase
        .from('user_profiles')
        .update({
          account_kind: 'partner',
          linked_owner_id: invite.owner_id,
          email: userEmail,
        })
        .eq('id', user.id)
    : await supabase.from('user_profiles').insert({
        id: user.id,
        email: userEmail,
        role: 'user',
        account_kind: 'partner',
        linked_owner_id: invite.owner_id,
      })

  if (write.error) {
    console.error('partner accept profile', write.error)
    return NextResponse.json({ error: 'Kunne ikke knytte kontoen som partner.' }, { status: 500 })
  }

  await supabase
    .from('partner_invitations')
    .update({ status: 'accepted', accepted_user_id: user.id })
    .eq('id', invite.id)

  return NextResponse.json({ success: true })
}
