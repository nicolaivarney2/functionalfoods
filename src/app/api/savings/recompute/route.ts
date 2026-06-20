/**
 * POST /api/savings/recompute — beregn + gem besparelses-snapshot for en madplan.
 *
 * Kaldes fra madbudget-UI'et (web + app) efter en plan er genereret/genberegnet
 * og priserne er hentet. Verificerer at madplanen tilhører brugeren, henter
 * median-reference server-side og upserter snapshot.
 *
 * Body: { mealPlanId, periodStart, persons, numDinners, storePrices, preferredStoreKey? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSupabaseRouteUser } from '@/lib/supabase-api-user';
import { calculateAndStoreSavingsSnapshot } from '@/lib/savings/calculate-savings-snapshot';
import type { StorePrices } from '@/lib/savings/types';

export const dynamic = 'force-dynamic';

interface RecomputeBody {
  mealPlanId?: string;
  periodStart?: string;
  persons?: number;
  numDinners?: number;
  storePrices?: StorePrices;
  preferredStoreKey?: string;
}

export async function POST(request: NextRequest) {
  const user = await getSupabaseRouteUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RecomputeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { mealPlanId, periodStart, persons, numDinners, storePrices, preferredStoreKey } = body;

  if (!mealPlanId || !periodStart || !storePrices || typeof persons !== 'number' || typeof numDinners !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // Verificér ejerskab af madplanen, så man kun kan skrive til egne snapshots.
  const { data: plan, error: planError } = await supabase
    .from('user_meal_plans')
    .select('id, user_id')
    .eq('id', mealPlanId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (planError || !plan) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }

  try {
    const result = await calculateAndStoreSavingsSnapshot({
      supabase,
      userId: user.id,
      mealPlanId,
      periodStart,
      persons,
      numDinners,
      storePrices,
      preferredStoreKey,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
