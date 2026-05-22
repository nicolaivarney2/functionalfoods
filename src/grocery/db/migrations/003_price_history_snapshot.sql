-- =====================================================================
-- Price history snapshot helper
-- =====================================================================
-- Captures the current state of `product_offers` into `price_history` for
-- the current date. Idempotent: re-running on the same day updates the
-- existing row (via ON CONFLICT on the unique (product_id, store_id,
-- snapshot_date) constraint) so cron retries are safe.
--
-- SECURITY DEFINER + bounded statement_timeout because price_history may
-- grow large (15 chains × 60k products × N days).

CREATE OR REPLACE FUNCTION public.snapshot_price_history()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5min'
AS $$
DECLARE
  rows_inserted integer;
BEGIN
  INSERT INTO public.price_history (
    product_id, store_id, price_cents, before_price_cents,
    is_on_sale, snapshot_date
  )
  SELECT
    o.product_id,
    o.store_id,
    o.price_cents,
    o.before_price_cents,
    o.is_on_sale,
    CURRENT_DATE
  FROM public.product_offers o
  WHERE o.price_cents IS NOT NULL
  ON CONFLICT (product_id, store_id, snapshot_date) DO UPDATE
    SET
      price_cents = EXCLUDED.price_cents,
      before_price_cents = EXCLUDED.before_price_cents,
      is_on_sale = EXCLUDED.is_on_sale;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_price_history() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.snapshot_price_history() TO service_role;

COMMENT ON FUNCTION public.snapshot_price_history() IS
  'Snapshot current product_offers into price_history for CURRENT_DATE. Idempotent for the same day. service_role only.';
