import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireAdmin } from '@/lib/admin-route-auth'
import { mapMember, MEMBER_PROFILE_SELECT, MEMBER_PROFILE_SELECT_LEGACY, type MemberProfileRow } from '@/lib/admin-members'
import type { SubscriptionSource } from '@/lib/subscription-source'

export const dynamic = 'force-dynamic'

const PAGE_SIZE_MAX = 100

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = serviceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const { searchParams } = request.nextUrl
  const q = (searchParams.get('q') || '').trim()
  const tierFilter = searchParams.get('tier') || 'all'
  const sourceFilter = (searchParams.get('source') || 'all') as SubscriptionSource | 'all'
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(10, Number.parseInt(searchParams.get('pageSize') || '50', 10) || 50)
  )
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const run = async (select: string) => {
    let query = supabase
      .from('user_profiles')
      .select(select, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (tierFilter === 'free' || tierFilter === 'plus' || tierFilter === 'premium') {
      query = query.eq('subscription_tier', tierFilter)
    } else if (tierFilter === 'paid') {
      query = query.in('subscription_tier', ['plus', 'premium'])
    }

    if (sourceFilter === 'stripe') {
      query = query.not('stripe_subscription_id', 'is', null)
    } else if (sourceFilter === 'app_store') {
      query = query.eq('subscription_source', 'app_store')
    } else if (sourceFilter === 'manual') {
      query = query.eq('subscription_source', 'manual')
    } else if (sourceFilter === 'unknown') {
      query = query.in('subscription_tier', ['plus', 'premium']).is('stripe_subscription_id', null)
    }

    if (q) {
      const escaped = q.replace(/[%_,.()]/g, '')
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      query = uuidRe.test(q)
        ? query.eq('id', q)
        : query.or(`email.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`)
    }

    return query
  }

  let { data, error, count } = await run(MEMBER_PROFILE_SELECT)
  if (
    error &&
    (String(error.message || '').includes('subscription_source') ||
      String(error.message || '').includes('lifetime_access') ||
      String(error.message || '').includes('referral_code'))
  ) {
    const fallback = await run(MEMBER_PROFILE_SELECT_LEGACY)
    data = fallback.data
    error = fallback.error
    count = fallback.count
  }

  if (error) {
    console.error('admin users list:', error)
    return NextResponse.json({ error: 'Kunne ikke hente brugere' }, { status: 500 })
  }

  const rows = (data || []) as unknown as MemberProfileRow[]
  const members = rows.map((row) => mapMember(row))

  const [{ count: total }, { count: plus }, { count: premium }, { count: stripeCount }, { count: storeOrUnknown }] =
    await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'plus'),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'premium'),
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .not('stripe_subscription_id', 'is', null),
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .in('subscription_tier', ['plus', 'premium'])
        .is('stripe_subscription_id', null),
    ])

  const sourceCounts = {
    stripe: stripeCount ?? 0,
    storeOrUnknown: storeOrUnknown ?? 0,
  }

  return NextResponse.json({
    users: members,
    page,
    pageSize,
    total: count ?? members.length,
    stats: {
      total: total ?? 0,
      plus: plus ?? 0,
      premium: premium ?? 0,
      free: Math.max(0, (total ?? 0) - (plus ?? 0) - (premium ?? 0)),
      stripe: sourceCounts.stripe,
      storeOrUnknown: sourceCounts.storeOrUnknown,
    },
    filters: { q, tier: tierFilter, source: sourceFilter },
  })
}
