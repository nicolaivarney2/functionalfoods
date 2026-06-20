/**
 * Median-referencepris fra price_history.
 *
 * Bruges af besparelses-modulet til at måle tilbud imod et ærligt, konservativt
 * grundlag i stedet for butikkens (potentielt oppustede) "normalpris".
 *
 * Læser price_history (synced fra fooddata), keyed på product_id (text, fx
 * "rema-1000-306899") + store_id. NB: FF's price_history gemmer prisen i DKK
 * (kolonne `price`), ikke i øre.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const WINDOW_DAYS = 90;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Median enhedspris (DKK) pr. product_external_id i en bestemt butik over de
 * seneste WINDOW_DAYS. Produkter uden historik udelades (caller falder tilbage
 * på normalpris).
 */
export async function getMedianReferencePrices(
  supabase: SupabaseClient,
  productExternalIds: string[],
  storeId: string
): Promise<Record<string, number>> {
  const ids = Array.from(new Set(productExternalIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('price_history')
    .select('product_id, price, snapshot_date')
    .in('product_id', ids)
    .eq('store_id', storeId)
    .gte('snapshot_date', since);

  if (error || !data) {
    if (error) console.error('getMedianReferencePrices error:', error.message);
    return {};
  }

  const byProduct = new Map<string, number[]>();
  for (const row of data as { product_id: string; price: number | null }[]) {
    const price = row.price;
    if (price == null || price <= 0) continue;
    const list = byProduct.get(row.product_id) ?? [];
    list.push(price);
    byProduct.set(row.product_id, list);
  }

  const out: Record<string, number> = {};
  for (const [productId, priceList] of byProduct) {
    const med = median(priceList);
    if (med > 0) out[productId] = med; // DKK pr. enhed
  }
  return out;
}
