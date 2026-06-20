/**
 * Typer for besparelses-beregningen ("Du har sparet X kr med Functional Foods").
 *
 * Modellen (ærlig men ambitiøs — se migration 20260620110000):
 *   total = item_savings (Motor A) + plan_savings (Motor B)
 *
 *   Motor A = Σ (referencepris − betalt pris) for varerne i indkøbslisten,
 *             målt i den valgte (billigste) butik. Referencepris = det laveste
 *             af normalpris og median-prishistorik → konservativt/anti-oppustet.
 *             Fanger tilbudsbesparelsen.
 *
 *   Motor B = (typisk madplan til normalpris) − (vores plan til normalpris).
 *             Fanger værdien af at vælge billigere-end-gennemsnit retter.
 *             Kræver en katalog-baseline (pris pr. portion) — se compute.ts.
 */

/** Ét pris-bud på en vare i én butik (delmængde af shopping-list-prices candidate). */
export interface PriceCandidate {
  product_external_id: string;
  /** Aktuel enhedspris (tilbud), DKK. */
  price?: number | null;
  /** Aktuel pris × antal pakker, DKK. */
  totalPrice: number;
  /** Normalpris pr. enhed, DKK. */
  normalPrice?: number | null;
  /** Normalpris × antal pakker, DKK. */
  totalNormalPrice?: number | null;
  isOnSale?: boolean;
  quantityNeeded?: number;
}

/** Priser pr. butik → pr. vare (output fra /api/madbudget/shopping-list-prices). */
export type StorePrices = Record<string, Record<string, PriceCandidate>>;

export type ReferenceBasis = 'history_median' | 'normal_price' | 'lowest_of';

export interface ComputeSavingsInput {
  /** Priser pr. butik/vare. */
  storePrices: StorePrices;
  /** Tving en bestemt butik; ellers vælges den billigste automatisk. */
  preferredStoreKey?: string;
  /** Median enhedspris (DKK) pr. product_external_id over de seneste ~90 dage. */
  medianUnitByProduct?: Record<string, number>;
  /**
   * Motor B-baseline: typisk pris pr. portion til normalpris (i øre).
   * Udeladt/0 = Motor B slået fra (plan_savings = 0) indtil katalog-pris
   * pr. portion er koblet på. Se compute.ts.
   */
  typicalPortionNormalCents?: number;
  /** Antal portioner (person-ækvivalenter × aftensmåltider) til Motor B. */
  portions?: number;
}

/** Dokumentation pr. vare — gemmes i breakdown-jsonb som "kvittering". */
export interface ItemSavingLine {
  product_external_id: string;
  paidCents: number;
  referenceCents: number;
  savedCents: number;
  basis: ReferenceBasis;
}

export interface SavingsResult {
  storeKey: string | null;
  planomoCostCents: number;
  baselineCostCents: number;
  itemSavingsCents: number;
  planSavingsCents: number;
  totalSavingsCents: number;
  referenceBasis: ReferenceBasis;
  breakdown: {
    items: ItemSavingLine[];
    motorA: { referenceCents: number; paidCents: number };
    motorB: { typicalCents: number; planNormalCents: number; portions: number } | null;
  };
}
