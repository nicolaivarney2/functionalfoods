/**
 * GET /api/savings — brugerens akkumulerede besparelse + seneste snapshots.
 *
 * Bruges af /besparelse-siden og spar-kortet på forsiden (web + app).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSupabaseRouteUser } from '@/lib/supabase-api-user';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getSupabaseRouteUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  const [{ data: totals }, { data: snapshots }] = await Promise.all([
    supabase.from('user_savings_totals').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('user_savings_snapshots')
      .select(
        'id, meal_plan_id, period_start, store_id, item_savings_cents, plan_savings_cents, total_savings_cents, planomo_cost_cents, baseline_cost_cents, reference_basis, created_at'
      )
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(26),
  ]);

  return NextResponse.json({
    totals: totals ?? {
      user_id: user.id,
      snapshot_count: 0,
      total_savings_cents: 0,
      item_savings_cents: 0,
      plan_savings_cents: 0,
      since_date: null,
      last_period: null,
    },
    snapshots: snapshots ?? [],
  });
}
