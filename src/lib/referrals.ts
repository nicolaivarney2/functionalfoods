import type { SupabaseClient } from '@supabase/supabase-js'

import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  REFERRAL_CLAIM_WINDOW_DAYS,
  REFERRAL_CODE_LENGTH,
  REFERRAL_COOKIE,
  REFERRAL_GOAL,
  REFERRAL_PROMPT_AFTER_MEAL_PLANS,
  REFERRAL_REWARD_EMAIL,
  REFERRAL_SHARE_ORIGIN,
  normalizeReferralCode,
  shareUrlForCode,
  type ReferralRewardStatus,
} from '@/lib/referral-shared'
import { sendTransactionalEmail } from '@/lib/send-transactional-email'

export {
  APP_STORE_URL,
  PLAY_STORE_URL,
  REFERRAL_COOKIE,
  REFERRAL_PROMPT_AFTER_MEAL_PLANS,
  normalizeReferralCode,
  shareUrlForCode,
}
export type { ReferralRewardStatus }

const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateReferralCode(): string {
  let out = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

export type ReferralSummary = {
  code: string
  shareUrl: string
  count: number
  goal: number
  lifetimeAccess: boolean
  rewardStatus: ReferralRewardStatus
  mealPlansGeneratedTotal: number
}

export type ClaimReferralResult =
  | { ok: true; alreadyClaimed?: boolean; count: number; notified: boolean }
  | { ok: false; error: 'missing_code' | 'unknown_code' | 'self' | 'too_old' | 'failed' }

type ProfileReferralRow = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  referral_code?: string | null
  referred_by?: string | null
  lifetime_access?: boolean | null
  lifetime_revoked_at?: string | null
  referral_reward_notified_at?: string | null
  created_at?: string | null
}

export function rewardStatusFor(row: {
  lifetime_access?: boolean | null
  lifetime_revoked_at?: string | null
  referral_reward_notified_at?: string | null
}): ReferralRewardStatus {
  if (row.lifetime_access) return 'granted'
  if (row.lifetime_revoked_at) return 'revoked'
  if (row.referral_reward_notified_at) return 'pending_review'
  return 'in_progress'
}

export async function ensureReferralCode(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from('user_profiles')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle()

  const existing = normalizeReferralCode((data as { referral_code?: string | null } | null)?.referral_code)
  if (existing) return existing

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateReferralCode()
    const { error } = await supabase
      .from('user_profiles')
      .update({ referral_code: code, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .is('referral_code', null)

    if (!error) {
      const { data: again } = await supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('id', userId)
        .maybeSingle()
      const saved = normalizeReferralCode((again as { referral_code?: string | null } | null)?.referral_code)
      if (saved) return saved
    }
  }

  const fallback = generateReferralCode()
  await supabase.from('user_profiles').update({ referral_code: fallback }).eq('id', userId)
  return fallback
}

export async function countReferrals(supabase: SupabaseClient, referrerId: string): Promise<number> {
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
  return count ?? 0
}

export async function countMealPlansGenerated(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from('meal_plan_generation_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}

export async function getReferralSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReferralSummary> {
  const { data: existing } = await supabase.from('user_profiles').select('id').eq('id', userId).maybeSingle()
  if (!existing) {
    await supabase.from('user_profiles').insert({ id: userId, role: 'user' })
  }
  const code = await ensureReferralCode(supabase, userId)
  const [{ data }, count, mealPlansGeneratedTotal] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('lifetime_access, lifetime_revoked_at, referral_reward_notified_at')
      .eq('id', userId)
      .maybeSingle(),
    countReferrals(supabase, userId),
    countMealPlansGenerated(supabase, userId),
  ])

  const row = (data ?? {}) as ProfileReferralRow
  return {
    code,
    shareUrl: shareUrlForCode(code),
    count,
    goal: REFERRAL_GOAL,
    lifetimeAccess: Boolean(row.lifetime_access),
    rewardStatus: rewardStatusFor(row),
    mealPlansGeneratedTotal,
  }
}

async function findReferrerByCode(
  supabase: SupabaseClient,
  code: string,
): Promise<ProfileReferralRow | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, first_name, last_name, referral_code, lifetime_access, referral_reward_notified_at')
    .eq('referral_code', code)
    .maybeSingle()
  return (data as ProfileReferralRow | null) ?? null
}

function displayName(row: ProfileReferralRow): string {
  const full = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
  return full || row.email || row.id
}

async function notifyRewardReached(
  supabase: SupabaseClient,
  referrer: ProfileReferralRow,
): Promise<boolean> {
  const { data: rows } = await supabase
    .from('referrals')
    .select('referee_id, created_at')
    .eq('referrer_id', referrer.id)
    .order('created_at', { ascending: true })

  const refereeIds = (rows ?? []).map((r) => r.referee_id as string)
  const { data: referees } = refereeIds.length
    ? await supabase.from('user_profiles').select('id, email, first_name, last_name, created_at').in('id', refereeIds)
    : { data: [] as ProfileReferralRow[] }

  const byId = new Map((referees ?? []).map((u) => [u.id, u as ProfileReferralRow]))
  const list = (rows ?? []).map((r, i) => {
    const u = byId.get(r.referee_id as string)
    const when = r.created_at ? new Date(r.created_at as string).toISOString() : ''
    return `${i + 1}. ${u ? displayName(u) : r.referee_id} (${u?.email ?? 'ingen e-mail'}) — ${when}`
  })

  const site = REFERRAL_SHARE_ORIGIN
  const result = await sendTransactionalEmail({
    to: process.env.REFERRAL_REWARD_EMAIL?.trim() || REFERRAL_REWARD_EMAIL,
    subject: `[FF henvisning] ${displayName(referrer)} har 10 oprettelser`,
    text: [
      'En bruger har nået 10 henvisninger og venter på Lifetime-gennemgang.',
      '',
      `Navn: ${displayName(referrer)}`,
      `E-mail: ${referrer.email ?? 'ukendt'}`,
      `Bruger-id: ${referrer.id}`,
      `Admin: ${site}/admin/users (søg på e-mail eller id)`,
      '',
      'Henviste oprettelser:',
      ...list,
      '',
      'Tildel Lifetime manuelt i admin hvis oprettelserne ser ægte ud.',
      'Tildel ikke automatisk — tjek at de ikke er tomme dummy-konti.',
    ].join('\n'),
    replyTo: referrer.email ?? undefined,
  })

  if (!result.ok) {
    console.error('referral reward email failed:', result.error)
    return false
  }

  await supabase
    .from('user_profiles')
    .update({
      referral_reward_notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', referrer.id)
    .is('referral_reward_notified_at', null)

  return true
}

export async function claimReferral(
  supabase: SupabaseClient,
  refereeId: string,
  rawCode: unknown,
): Promise<ClaimReferralResult> {
  const code = normalizeReferralCode(rawCode)
  if (!code) return { ok: false, error: 'missing_code' }

  const referrer = await findReferrerByCode(supabase, code)
  if (!referrer) return { ok: false, error: 'unknown_code' }
  if (referrer.id === refereeId) return { ok: false, error: 'self' }

  const { data: existing } = await supabase
    .from('referrals')
    .select('id, referrer_id')
    .eq('referee_id', refereeId)
    .maybeSingle()

  if (existing) {
    const { count } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', existing.referrer_id as string)
    return { ok: true, alreadyClaimed: true, count: count ?? 0, notified: false }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, referred_by, created_at')
    .eq('id', refereeId)
    .maybeSingle()

  if (!profile) {
    await supabase.from('user_profiles').insert({
      id: refereeId,
      role: 'user',
    })
  }

  const createdAt = (profile as ProfileReferralRow | null)?.created_at
  if (createdAt) {
    const ageMs = Date.now() - new Date(createdAt).getTime()
    if (ageMs > REFERRAL_CLAIM_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
      return { ok: false, error: 'too_old' }
    }
  }

  const { error: insertError } = await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referee_id: refereeId,
  })

  if (insertError) {
    if (String(insertError.message || '').includes('referrals_referee_unique')) {
      return { ok: true, alreadyClaimed: true, count: await countReferrals(supabase, referrer.id), notified: false }
    }
    console.error('claimReferral insert:', insertError)
    return { ok: false, error: 'failed' }
  }

  await supabase
    .from('user_profiles')
    .update({ referred_by: referrer.id, updated_at: new Date().toISOString() })
    .eq('id', refereeId)
    .is('referred_by', null)

  const count = await countReferrals(supabase, referrer.id)
  let notified = false
  if (count >= REFERRAL_GOAL && !referrer.referral_reward_notified_at) {
    notified = await notifyRewardReached(supabase, referrer)
  }

  return { ok: true, count, notified }
}

export async function listReferralsForAdmin(supabase: SupabaseClient, referrerId: string) {
  const { data: rows } = await supabase
    .from('referrals')
    .select('referee_id, created_at')
    .eq('referrer_id', referrerId)
    .order('created_at', { ascending: true })

  const ids = (rows ?? []).map((r) => r.referee_id as string)
  const { data: people } = ids.length
    ? await supabase.from('user_profiles').select('id, email, first_name, last_name, created_at').in('id', ids)
    : { data: [] as ProfileReferralRow[] }

  const byId = new Map((people ?? []).map((u) => [u.id, u as ProfileReferralRow]))
  return (rows ?? []).map((r) => {
    const u = byId.get(r.referee_id as string)
    return {
      id: r.referee_id as string,
      email: u?.email ?? null,
      name: u ? displayName(u) : null,
      createdAt: (r.created_at as string) ?? null,
      refereeCreatedAt: u?.created_at ?? null,
    }
  })
}
