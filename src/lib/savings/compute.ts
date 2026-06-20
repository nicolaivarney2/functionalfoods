/**
 * Ren beregning af besparelse (ingen IO — testbar).
 *
 * Hjernen bag "Du har sparet X kr med Functional Foods". Se types.ts for modellen.
 *
 * Ærligheds-garderinger:
 *   - Referencepris = laveste af (normalpris, median-prishistorik). Vi underdriver
 *     hellere end at oppuste en kunstig "før-pris".
 *   - Ingen vare bidrager negativt (referencepris < betalt klippes til 0 besparelse).
 *   - Motor B er slået fra som standard (kræver katalog-pris pr. portion).
 */

import type {
  ComputeSavingsInput,
  ItemSavingLine,
  PriceCandidate,
  ReferenceBasis,
  SavingsResult,
} from './types';

const toCents = (kr: number): number => Math.round(kr * 100);

/** Summen af betalt pris (DKK) for alle varer i en butik. */
function storeTotal(items: Record<string, PriceCandidate>): number {
  return Object.values(items).reduce((sum, c) => sum + (Number(c.totalPrice) || 0), 0);
}

/** Vælg butik: enten den foretrukne, ellers den billigste på tværs. */
function pickStoreKey(input: ComputeSavingsInput): string | null {
  const keys = Object.keys(input.storePrices);
  if (keys.length === 0) return null;
  if (input.preferredStoreKey && input.storePrices[input.preferredStoreKey]) {
    return input.preferredStoreKey;
  }
  let bestKey = keys[0];
  let bestTotal = Infinity;
  for (const key of keys) {
    const total = storeTotal(input.storePrices[key]);
    if (total > 0 && total < bestTotal) {
      bestTotal = total;
      bestKey = key;
    }
  }
  return bestKey;
}

/**
 * Referencepris (DKK total) for én vare = laveste af normalpris-total og
 * median-total, aldrig under det betalte. Returnerer også hvilket grundlag
 * der blev brugt.
 */
function referenceForItem(
  c: PriceCandidate,
  medianUnit: number | undefined
): { referenceTotal: number; basis: ReferenceBasis } {
  const paid = Number(c.totalPrice) || 0;
  const qty = Number(c.quantityNeeded) || 1;

  const candidates: { value: number; basis: ReferenceBasis }[] = [];
  if (c.totalNormalPrice != null && c.totalNormalPrice > 0) {
    candidates.push({ value: c.totalNormalPrice, basis: 'normal_price' });
  } else if (c.normalPrice != null && c.normalPrice > 0) {
    candidates.push({ value: c.normalPrice * qty, basis: 'normal_price' });
  }
  if (medianUnit != null && medianUnit > 0) {
    candidates.push({ value: medianUnit * qty, basis: 'history_median' });
  }

  if (candidates.length === 0) {
    // Ingen reference → ingen besparelse (konservativt).
    return { referenceTotal: paid, basis: 'normal_price' };
  }

  // Laveste reference = mest konservative besparelse.
  const lowest = candidates.reduce((a, b) => (b.value < a.value ? b : a));
  const referenceTotal = Math.max(lowest.value, paid);
  // Hvis vi havde begge grundlag at vælge imellem, markér som 'lowest_of'.
  const basis: ReferenceBasis = candidates.length > 1 ? 'lowest_of' : lowest.basis;
  return { referenceTotal, basis };
}

export function computeSavings(input: ComputeSavingsInput): SavingsResult {
  const storeKey = pickStoreKey(input);

  if (!storeKey) {
    return {
      storeKey: null,
      planomoCostCents: 0,
      baselineCostCents: 0,
      itemSavingsCents: 0,
      planSavingsCents: 0,
      totalSavingsCents: 0,
      referenceBasis: 'normal_price',
      breakdown: { items: [], motorA: { referenceCents: 0, paidCents: 0 }, motorB: null },
    };
  }

  const items = input.storePrices[storeKey];
  const median = input.medianUnitByProduct ?? {};

  const lines: ItemSavingLine[] = [];
  let paidCents = 0;
  let referenceCents = 0;
  const basisSeen = new Set<ReferenceBasis>();

  for (const c of Object.values(items)) {
    const paid = Number(c.totalPrice) || 0;
    if (paid <= 0) continue;
    const { referenceTotal, basis } = referenceForItem(c, median[c.product_external_id]);
    const paidC = toCents(paid);
    const refC = toCents(referenceTotal);
    const savedC = Math.max(0, refC - paidC);

    paidCents += paidC;
    referenceCents += refC;
    if (savedC > 0) basisSeen.add(basis);

    lines.push({
      product_external_id: c.product_external_id,
      paidCents: paidC,
      referenceCents: refC,
      savedCents: savedC,
      basis,
    });
  }

  const itemSavingsCents = Math.max(0, referenceCents - paidCents);

  // Motor B: typisk plan til normalpris − denne plans normalpris (referenceCents).
  let planSavingsCents = 0;
  let motorB: SavingsResult['breakdown']['motorB'] = null;
  const portions = input.portions ?? 0;
  if (input.typicalPortionNormalCents && input.typicalPortionNormalCents > 0 && portions > 0) {
    const typicalCents = Math.round(input.typicalPortionNormalCents * portions);
    planSavingsCents = Math.max(0, typicalCents - referenceCents);
    motorB = { typicalCents, planNormalCents: referenceCents, portions };
  }

  const totalSavingsCents = itemSavingsCents + planSavingsCents;

  // Dominerende reference-grundlag til snapshot-feltet.
  const referenceBasis: ReferenceBasis = basisSeen.has('lowest_of')
    ? 'lowest_of'
    : basisSeen.has('history_median')
      ? 'history_median'
      : 'normal_price';

  return {
    storeKey,
    planomoCostCents: paidCents,
    baselineCostCents: paidCents + totalSavingsCents,
    itemSavingsCents,
    planSavingsCents,
    totalSavingsCents,
    referenceBasis,
    breakdown: {
      items: lines,
      motorA: { referenceCents, paidCents },
      motorB,
    },
  };
}
