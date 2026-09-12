import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { partnerInviteUrl } from '@/lib/household-access'
import { sendLoopsPartnerInviteEmail } from '@/lib/loops-subscribe'

const INVITE_TTL_DAYS = 14
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeInviteEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) return null
  return email
}

export function newInviteToken(): string {
  return randomBytes(24).toString('hex')
}

export function inviteExpiryIso(now = new Date()): string {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

export async function ownerHasPartner(supabase: SupabaseClient, ownerId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('account_kind', 'partner')
    .eq('linked_owner_id', ownerId)
    .maybeSingle()
  return Boolean(data?.id)
}

export async function userHasHouseholdData(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const [{ count: plans }, { count: family }] = await Promise.all([
    supabase.from('user_meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('family_profiles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  return (plans ?? 0) > 0 || (family ?? 0) > 0
}

export async function sendPartnerInviteEmail(opts: {
  toEmail: string
  inviterName: string
  inviteUrl: string
}): Promise<{ ok: boolean }> {
  const result = await sendLoopsPartnerInviteEmail({
    email: opts.toEmail,
    inviterName: opts.inviterName,
    inviteUrl: opts.inviteUrl,
  })
  if (!result.ok) {
    console.warn('partner invite email:', result.error)
  }
  return { ok: result.ok }
}

export { partnerInviteUrl }
