import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { ownerHasPartner, userHasHouseholdData } from '@/lib/partner-invite'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Ugyldigt link.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Skriv en gyldig e-mailadresse.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Adgangskoden skal være mindst 6 tegn.' }, { status: 400 })
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'Skriv dit navn.' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const { data: invite } = await supabase
    .from('partner_invitations')
    .select('id, status, expires_at, owner_id')
    .eq('token', token)
    .maybeSingle()

  if (!invite || invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invitationen er ugyldig eller allerede brugt.' }, { status: 404 })
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await supabase.from('partner_invitations').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Invitationen er udløbet.' }, { status: 410 })
  }

  if (await ownerHasPartner(supabase, invite.owner_id)) {
    return NextResponse.json({ error: 'Husstanden har allerede en partner.' }, { status: 409 })
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (created.error || !created.data.user) {
    const msg = created.error?.message || 'Kunne ikke oprette kontoen.'
    if (/already|registered|exists/i.test(msg)) {
      return NextResponse.json(
        { error: 'Den e-mail har allerede en konto. Log ind i stedet.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = created.data.user.id
  if (await userHasHouseholdData(supabase, userId)) {
    return NextResponse.json(
      { error: 'Kontoen har allerede sin egen madplan. Brug en ny, tom e-mail.' },
      { status: 409 }
    )
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, account_kind')
    .eq('id', userId)
    .maybeSingle()

  const write = profile
    ? await supabase
        .from('user_profiles')
        .update({
          account_kind: 'partner',
          linked_owner_id: invite.owner_id,
          email,
        })
        .eq('id', userId)
    : await supabase.from('user_profiles').insert({
        id: userId,
        email,
        role: 'user',
        account_kind: 'partner',
        linked_owner_id: invite.owner_id,
      })

  if (write.error) {
    console.error('partner register profile', write.error)
    return NextResponse.json({ error: 'Kunne ikke knytte kontoen som partner.' }, { status: 500 })
  }

  await supabase
    .from('partner_invitations')
    .update({ status: 'accepted', accepted_user_id: userId, email })
    .eq('id', invite.id)

  return NextResponse.json({ success: true, email })
}
