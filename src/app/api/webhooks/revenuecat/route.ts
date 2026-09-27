import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { setUserSubscriptionTier } from '@/lib/subscription-entitlements'

export const dynamic = 'force-dynamic'

type RcEvent = {
  type?: string
  app_user_id?: string
  entitlement_ids?: string[] | null
}

/**
 * RevenueCat → profil. Så prøve, fornyelse og opsigelse gælder, også når appen er lukket.
 * Authorization: Bearer REVENUECAT_WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!secret || !serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = (await request.json().catch(() => null)) as { event?: RcEvent } | null
  const event = payload?.event
  const userId = event?.app_user_id
  const ids = event?.entitlement_ids ?? []
  if (!event?.type || !userId || userId.startsWith('$RCAnonymous')) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const grant = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'TEMPORARY_ENTITLEMENT_GRANT']
  const revoke = event.type === 'EXPIRATION'

  if (grant.includes(event.type)) {
    if (ids.includes('premium')) {
      await setUserSubscriptionTier(supabase, userId, 'premium', {
        monthlyAmountOre: 24900,
        subscriptionSource: 'app_store',
      })
      await supabase.from('user_profiles').update({ community_access: true }).eq('id', userId)
    } else if (ids.includes('plus')) {
      await setUserSubscriptionTier(supabase, userId, 'plus', {
        monthlyAmountOre: 2900,
        subscriptionSource: 'app_store',
      })
    }
    if (ids.includes('community')) {
      await supabase.from('user_profiles').update({ community_access: true }).eq('id', userId)
      if (!ids.includes('premium') && !ids.includes('plus')) {
        await setUserSubscriptionTier(supabase, userId, 'plus', {
          monthlyAmountOre: 4900,
          subscriptionSource: 'app_store',
        })
      }
    }
  }

  if (revoke) {
    if (ids.includes('community')) {
      await supabase.from('user_profiles').update({ community_access: false }).eq('id', userId)
    }
    if (ids.includes('premium') || ids.includes('plus')) {
      await setUserSubscriptionTier(supabase, userId, 'free', {
        monthlyAmountOre: null,
        subscriptionSource: 'none',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
