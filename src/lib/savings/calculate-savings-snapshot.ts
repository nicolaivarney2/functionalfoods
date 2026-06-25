/**
 * Orkestrering: beregn + gem et besparelses-snapshot for en madplan.
 *
 * Kaldes server-side efter en madplan er genereret/genberegnet og priserne er
 * hentet. Samler median-referencepriser, kører den rene beregning (compute.ts)
 * og upserter i user_savings_snapshots (unik pr. user_id + meal_plan_id).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { computeSavings } from './compute';
import { getMedianReferencePrices } from './reference-price';
import type { StorePrices } from './types';

/**
 * Motor B-baseline: typisk pris pr. måltids-portion til NORMALPRIS, i øre.
 *
 * Læses fra savings_config (key 'typical_dinner_portion_normal_cents'); denne
 * konstant er fallback når der ikke er en override i databasen.
 *
 * Konservativt sat: ~35 kr for en hjemmelavet måltids-portion til normalpris
 * (inkl. kød/protein). Motor B sammenligner planens normalpris-total med dette,
 * så besparelsen klippes automatisk til 0, hvis planen er dyrere end "typisk" —
 * vi oppuster derfor ikke. At sætte den > 0 (frem for 0) gør, at "Smartere
 * madplan"-delen rent faktisk tæller med, i stedet for altid at vise 0 kr.
 */
export const TYPICAL_DINNER_PORTION_NORMAL_CENTS = 3500;

const BASELINE_CONFIG_KEY = 'typical_dinner_portion_normal_cents';

/** Hent Motor B-baseline (øre pr. portion) fra savings_config. */
export async function getTypicalPortionBaselineCents(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('savings_config')
    .select('value_cents')
    .eq('key', BASELINE_CONFIG_KEY)
    .maybeSingle();
  if (error || !data) return TYPICAL_DINNER_PORTION_NORMAL_CENTS;
  return Number(data.value_cents) || 0;
}

export interface SnapshotParams {
  /** Service-role client (auth + price_history + snapshots). */
  supabase: SupabaseClient;
  userId: string;
  mealPlanId: string;
  /** Ugens start (mandag), 'YYYY-MM-DD'. */
  periodStart: string;
  /** Person-ækvivalenter i familien. */
  persons: number;
  /** Antal aftensmåltider i planen. */
  numDinners: number;
  /** Priser pr. butik/vare (fra /api/madbudget/shopping-list-prices). */
  storePrices: StorePrices;
  /** Tving butik; ellers vælges billigste. */
  preferredStoreKey?: string;
  /** Motor B-baseline (øre pr. portion). Default = slået fra. */
  typicalPortionNormalCents?: number;
}

export async function calculateAndStoreSavingsSnapshot(params: SnapshotParams) {
  const {
    supabase,
    userId,
    mealPlanId,
    periodStart,
    persons,
    numDinners,
    storePrices,
    preferredStoreKey,
  } = params;

  const typicalPortionNormalCents =
    params.typicalPortionNormalCents ?? (await getTypicalPortionBaselineCents(supabase));

  const portions = Math.max(0, Math.round(persons * numDinners));

  // 1) Find butikken (billigste eller foretrukne) uden median, så vi ved hvilke
  //    produkter vi skal slå historik op for.
  const firstPass = computeSavings({ storePrices, preferredStoreKey });
  const storeKey = firstPass.storeKey;

  let medianUnitByProduct: Record<string, number> = {};
  if (storeKey) {
    const productIds = Object.values(storePrices[storeKey] ?? {}).map((c) => c.product_external_id);
    medianUnitByProduct = await getMedianReferencePrices(supabase, productIds, storeKey);
  }

  // 2) Endelig beregning med median-reference.
  const result = computeSavings({
    storePrices,
    preferredStoreKey: storeKey ?? undefined,
    medianUnitByProduct,
    typicalPortionNormalCents,
    portions,
  });

  // 3) Upsert snapshot (unik pr. user_id + meal_plan_id).
  const row = {
    user_id: userId,
    meal_plan_id: mealPlanId,
    period_start: periodStart,
    persons: Math.round(persons),
    num_dinners: numDinners,
    store_id: result.storeKey,
    baseline_cost_cents: result.baselineCostCents,
    planomo_cost_cents: result.planomoCostCents,
    item_savings_cents: result.itemSavingsCents,
    plan_savings_cents: result.planSavingsCents,
    total_savings_cents: result.totalSavingsCents,
    reference_basis: result.referenceBasis,
    breakdown: result.breakdown,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('user_savings_snapshots')
    .upsert(row, { onConflict: 'user_id,meal_plan_id' });

  if (error) {
    console.error('calculateAndStoreSavingsSnapshot upsert error:', error.message);
    throw new Error(`Kunne ikke gemme besparelse: ${error.message}`);
  }

  return result;
}
