-- =====================================================================
-- Daily cleanup of expired offers + tombstoning of stale products
-- =====================================================================
-- Rod-årsags-fix for "døde tilbud" på /dagligvarer:
--
-- Tjek/Salling/REMA-tilbud har en `offer_until` der sætter grænsen for
-- hvornår de ikke længere er på tilbud. Tidligere reliede vi udelukkende
-- på `sleepStaleOffersForChain` der KUN kører per-kæde på kædens
-- scheduled sync-dag (fx lørdag for netto/bilka). Et Netto-tilbud der
-- udløber tirsdag forblev aktivt i 4 dage → false positives på /dagligvarer.
--
-- Denne migration tilføjer en `cleanup_expired_offers()` RPC der:
--   1. Sætter alle product_offers med offer_until < now til
--      is_on_sale=false, in_stock=false (pris bevares for Planomo
--      sticky matches).
--   2. Sætter products.active=false for produkter hvor:
--      - ingen tilbud er is_on_sale=true eller in_stock=true
--      - last_seen_at er ældre end p_stale_product_days (default 30)
--      → dvs. produktet er forsvundet fra kildens API og alle dets
--        tilbud er udløbet. Ikke slet — rækken skal bevares for
--        Planomo last_known_price.
--
-- Kaldes af /api/grocery/sync/cleanup-expired cron (Vercel 04:30 UTC).
-- Idempotent og sikker at køre flere gange dagligt.

CREATE OR REPLACE FUNCTION public.cleanup_expired_offers(
  p_stale_product_days integer DEFAULT 30,
  p_batch_limit integer DEFAULT 50000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '90s'
AS $$
DECLARE
  v_now timestamptz := now();
  v_offers_cleaned integer := 0;
  v_products_tombstoned integer := 0;
  v_stale_threshold timestamptz;
BEGIN
  -- Anchored subquery for expired offers: avoids the 1000-row PostgREST
  -- limit and lets a single SQL statement do the heavy lifting.
  -- 1) Sleep all offers whose offer_until is in the past.
  UPDATE public.product_offers
  SET
    is_on_sale = false,
    in_stock = false,
    updated_at = v_now
  WHERE (is_on_sale = true OR in_stock = true)
    AND offer_until IS NOT NULL
    AND offer_until < v_now
    AND id IN (
      SELECT id FROM public.product_offers
      WHERE (is_on_sale = true OR in_stock = true)
        AND offer_until IS NOT NULL
        AND offer_until < v_now
      LIMIT p_batch_limit
    );

  GET DIAGNOSTICS v_offers_cleaned = ROW_COUNT;

  -- 2) Tombstone products whose every offer is inactive AND whose
  --    last_seen_at is older than the stale threshold. The threshold
  --    protects against race conditions where a weekly chain simply
  --    hasn't synced yet (Tjek catalogs run on a 7-day rhythm).
  v_stale_threshold := v_now - make_interval(days => p_stale_product_days);

  UPDATE public.products p
  SET
    active = false,
    updated_at = v_now
  WHERE p.active = true
    AND p.last_seen_at < v_stale_threshold
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_offers o
      WHERE o.product_id = p.id
        AND (o.is_on_sale = true OR o.in_stock = true)
    )
    AND p.id IN (
      SELECT p2.id
      FROM public.products p2
      WHERE p2.active = true
        AND p2.last_seen_at < v_stale_threshold
        AND NOT EXISTS (
          SELECT 1
          FROM public.product_offers o2
          WHERE o2.product_id = p2.id
            AND (o2.is_on_sale = true OR o2.in_stock = true)
        )
      LIMIT p_batch_limit
    );

  GET DIAGNOSTICS v_products_tombstoned = ROW_COUNT;

  RETURN jsonb_build_object(
    'cleaned_at', v_now,
    'offers_cleaned', v_offers_cleaned,
    'products_tombstoned', v_products_tombstoned,
    'stale_product_days', p_stale_product_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_offers(integer, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_offers(integer, integer) TO service_role;

COMMENT ON FUNCTION public.cleanup_expired_offers(integer, integer) IS
  'Daily cleanup: sleep expired offers (offer_until < now) and tombstone products with no active offers older than p_stale_product_days. Idempotent. service_role only.';

-- Supporting index: cheap lookup for "expired but still flagged active".
CREATE INDEX IF NOT EXISTS idx_offers_expired_active
  ON public.product_offers (offer_until)
  WHERE is_on_sale = true OR in_stock = true;

-- Supporting index: cheap lookup for stale products with no active offers.
CREATE INDEX IF NOT EXISTS idx_products_active_last_seen
  ON public.products (last_seen_at)
  WHERE active = true;
