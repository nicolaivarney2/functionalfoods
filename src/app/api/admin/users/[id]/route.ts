import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireAdmin } from '@/lib/admin-route-auth'
import {
  fetchStripeLive,
  mapMember,
  MEMBER_PROFILE_SELECT,
  MEMBER_PROFILE_SELECT_LEGACY,
  type MemberProfileRow,
} from '@/lib/admin-members'
import { listReferralsForAdmin } from '@/lib/referrals'
import {
  countCellsMissingIngredients,
  countMealsInGrid,
} from '@/lib/madbudget/meal-plan-ingredients'
import { shoppingListItemCount } from '@/lib/madbudget/shopping-list-presence'
import { getStripe } from '@/lib/stripe-server'
import { setUserSubscriptionTier } from '@/lib/subscription-entitlements'
import { normalizeSubscriptionTier, type SubscriptionTier } from '@/lib/subscription-tiers'

export const dynamic = 'force-dynamic'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function loadProfile(supabase: ReturnType<typeof serviceClient>, id: string) {
  if (!supabase) return { row: null, error: new Error('no client') }
  const first = await supabase.from('user_profiles').select(MEMBER_PROFILE_SELECT).eq('id', id).maybeSingle()
  if (!first.error) return { row: first.data as MemberProfileRow | null, error: null }
  const msg = String(first.error.message || '')
  if (msg.includes('subscription_source') || msg.includes('lifetime_access') || msg.includes('referral_code')) {
    const legacy = await supabase
      .from('user_profiles')
      .select(MEMBER_PROFILE_SELECT_LEGACY)
      .eq('id', id)
      .maybeSingle()
    return { row: (legacy.data as MemberProfileRow | null) ?? null, error: legacy.error }
  }
  return { row: null, error: first.error }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { row, error } = await loadProfile(supabase, id)
  if (error) {
    console.error('admin user get:', error)
    return NextResponse.json({ error: 'Kunne ikke hente bruger' }, { status: 500 })
  }
  if (!row) return NextResponse.json({ error: 'Bruger findes ikke' }, { status: 404 })

  let stripeLive = null
  if (row.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    stripeLive = await fetchStripeLive(getStripe(), row.stripe_subscription_id)
  }

  const referrals = await listReferralsForAdmin(supabase, id)

  const { data: plan } = await supabase
    .from('user_meal_plans')
    .select('id, week_number, week_start_date, meal_plan_data, shopping_list')
    .eq('user_id', id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const mealPlan = plan
    ? {
        id: plan.id,
        weekNumber: plan.week_number,
        weekStartDate: plan.week_start_date,
        mealCount: countMealsInGrid(plan.meal_plan_data),
        shoppingItemCount: shoppingListItemCount(plan.shopping_list),
        missingIngredients: countCellsMissingIngredients(plan.meal_plan_data),
      }
    : null

  return NextResponse.json({ user: mapMember(row, stripeLive), referrals, mealPlan })
}

/**
 * PATCH: sæt tier manuelt (gratis / plus / premium) og/eller Lifetime.
 * Opsiger ikke App Store. Fjerner Stripe-knytning hvis sat til free.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const wantsLifetime = typeof body.lifetime === 'boolean'
  const wantsTier = body.tier === 'free' || body.tier === 'plus' || body.tier === 'premium'
  if (!wantsLifetime && !wantsTier) {
    return NextResponse.json({ error: 'Angiv tier eller lifetime' }, { status: 400 })
  }

  const { row, error } = await loadProfile(supabase, id)
  if (error || !row) {
    return NextResponse.json({ error: 'Bruger findes ikke' }, { status: 404 })
  }

  const now = new Date().toISOString()

  if (wantsLifetime && body.lifetime === true) {
    await supabase
      .from('user_profiles')
      .update({
        lifetime_access: true,
        lifetime_granted_at: now,
        lifetime_revoked_at: null,
        updated_at: now,
      })
      .eq('id', id)

    const current = normalizeSubscriptionTier(row.subscription_tier)
    if (current === 'free') {
      await setUserSubscriptionTier(supabase, id, 'plus', {
        monthlyAmountOre: 2900,
        subscriptionSource: 'manual',
      })
    }
  }

  if (wantsLifetime && body.lifetime === false) {
    await supabase
      .from('user_profiles')
      .update({
        lifetime_access: false,
        lifetime_revoked_at: now,
        updated_at: now,
      })
      .eq('id', id)

    const source = row.subscription_source
    const hasStripe = Boolean(row.stripe_subscription_id)
    if (!hasStripe && (source === 'manual' || source === 'none' || !source)) {
      await setUserSubscriptionTier(supabase, id, 'free', {
        stripeSubscriptionId: null,
        monthlyAmountOre: null,
        subscriptionSource: 'none',
        ignoreLifetime: true,
      })
    }
  }

  if (wantsTier) {
    const tier = normalizeSubscriptionTier(body.tier) as SubscriptionTier
    if (tier === 'free') {
      await setUserSubscriptionTier(supabase, id, 'free', {
        stripeSubscriptionId: null,
        monthlyAmountOre: null,
        subscriptionSource: 'none',
        ignoreLifetime: true,
      })
    } else {
      await setUserSubscriptionTier(supabase, id, tier, {
        monthlyAmountOre: tier === 'premium' ? 24900 : 2900,
        subscriptionSource: 'manual',
      })
    }
  }

  const reloaded = await loadProfile(supabase, id)
  const referrals = await listReferralsForAdmin(supabase, id)
  return NextResponse.json({
    ok: true,
    user: reloaded.row ? mapMember(reloaded.row) : null,
    referrals,
  })
}
