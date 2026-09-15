import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { displayNameFromUser, loadHouseholdForUser } from '@/lib/household-access'
import { createSupabaseServiceClient } from '@/lib/supabase'
import {
  inviteExpiryIso,
  newInviteToken,
  ownerHasPartner,
  partnerInviteUrl,
} from '@/lib/partner-invite'

export const dynamic = 'force-dynamic'

function profileName(row: {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
} | null): string {
  const full = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim()
  if (full) return full
  return row?.email?.split('@')[0] || 'Partner'
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const household = await loadHouseholdForUser(user)
  if (!household) {
    return NextResponse.json({ error: 'Kontoen er ikke knyttet til en husstand.' }, { status: 403 })
  }

  const supabase = createSupabaseServiceClient()

  if (household.accountKind === 'partner') {
    const { data: owner } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .eq('id', household.ownerId)
      .maybeSingle()
    return NextResponse.json({
      accountKind: 'partner',
      owner: owner
        ? { id: owner.id, email: owner.email, name: profileName(owner) }
        : { id: household.ownerId, email: '', name: 'Husstand' },
      partner: {
        id: user.id,
        email: user.email,
        name: displayNameFromUser(user),
      },
      pendingInvite: null,
    })
  }

  const { data: partner } = await supabase
    .from('user_profiles')
    .select('id, email, first_name, last_name')
    .eq('account_kind', 'partner')
    .eq('linked_owner_id', user.id)
    .maybeSingle()

  const { data: pending } = await supabase
    .from('partner_invitations')
    .select('email, token, expires_at')
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  const pendingValid =
    pending && new Date(pending.expires_at).getTime() > Date.now() ? pending : null

  if (pending && !pendingValid) {
    await supabase
      .from('partner_invitations')
      .update({ status: 'expired' })
      .eq('owner_id', user.id)
      .eq('status', 'pending')
  }

  return NextResponse.json({
    accountKind: 'primary',
    owner: {
      id: user.id,
      email: user.email,
      name: displayNameFromUser(user),
    },
    partner: partner
      ? { id: partner.id, email: partner.email, name: profileName(partner) }
      : null,
    pendingInvite: pendingValid
      ? {
          email: pendingValid.email,
          inviteUrl: partnerInviteUrl(pendingValid.token),
          expiresAt: pendingValid.expires_at,
        }
      : null,
  })
}

async function revokePendingInvite(ownerId: string) {
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('partner_invitations')
    .update({ status: 'revoked' })
    .eq('owner_id', ownerId)
    .eq('status', 'pending')
  if (error) {
    console.error('partner invite revoke', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const household = await loadHouseholdForUser(user)
  if (!household || household.accountKind !== 'primary') {
    return NextResponse.json({ error: 'Kun den primære konto kan invitere en partner.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  if (body?.action === 'revoke-invite') {
    try {
      await revokePendingInvite(user.id)
    } catch {
      return NextResponse.json({ error: 'Kunne ikke annullere invitationen.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  const supabase = createSupabaseServiceClient()

  if (await ownerHasPartner(supabase, user.id)) {
    return NextResponse.json(
      { error: 'I har allerede en partner på husstanden. Fjern vedkommende først, hvis I vil invitere en anden.' },
      { status: 409 }
    )
  }

  await revokePendingInvite(user.id)

  const token = newInviteToken()
  const { error } = await supabase.from('partner_invitations').insert({
    owner_id: user.id,
    email: '',
    token,
    status: 'pending',
    expires_at: inviteExpiryIso(),
  })

  if (error) {
    console.error('partner invite insert', error)
    return NextResponse.json({ error: 'Kunne ikke oprette invitationen.' }, { status: 500 })
  }

  const inviteUrl = partnerInviteUrl(token)

  return NextResponse.json({
    success: true,
    inviteUrl,
    emailSent: false,
  })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const household = await loadHouseholdForUser(user)
  if (!household) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseServiceClient()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'partner'

  if (household.accountKind === 'partner') {
    if (action !== 'leave') {
      return NextResponse.json({ error: 'Partneren kan kun forlade husstanden.' }, { status: 403 })
    }
    await supabase
      .from('user_profiles')
      .update({ account_kind: 'primary', linked_owner_id: null })
      .eq('id', user.id)
    return NextResponse.json({ success: true })
  }

  if (action === 'invite') {
    try {
      await revokePendingInvite(user.id)
    } catch {
      return NextResponse.json({ error: 'Kunne ikke annullere invitationen.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  const { data: partner } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('account_kind', 'partner')
    .eq('linked_owner_id', user.id)
    .maybeSingle()

  if (partner?.id) {
    await supabase
      .from('user_profiles')
      .update({ account_kind: 'primary', linked_owner_id: null })
      .eq('id', partner.id)
  }

  await supabase
    .from('partner_invitations')
    .update({ status: 'revoked' })
    .eq('owner_id', user.id)
    .eq('status', 'pending')

  return NextResponse.json({ success: true })
}
