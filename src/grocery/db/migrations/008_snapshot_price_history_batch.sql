-- =====================================================================
-- Batched price-history snapshot (avoids Supabase API gateway timeout)
-- =====================================================================
-- snapshot_price_history() upserts ALL current offers in one statement.
-- That routinely exceeds Kong's ~120s "upstream request timeout" even
-- though the function's own statement_timeout is 5min.
--
-- This pageable RPC snapshots one store at a time, paged by product_id.

CREATE INDEX IF NOT EXISTS idx_offers_store_product
  ON public.product_offers (store_id, product_id);

CREATE OR REPLACE FUNCTION public.snapshot_price_history_batch(
  p_store_id text,
  p_after_product_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 1500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  batch_limit integer;
  rows_inserted integer;
  last_id uuid;
BEGIN
  batch_limit := LEAST(GREATEST(COALESCE(p_limit, 1500), 1), 5000);

  WITH batch AS (
    SELECT
      o.product_id,
      o.store_id,
      o.price_cents,
      o.before_price_cents,
      o.is_on_sale
    FROM public.product_offers o
    WHERE o.price_cents IS NOT NULL
      AND o.store_id = p_store_id
      AND (p_after_product_id IS NULL OR o.product_id > p_after_product_id)
    ORDER BY o.product_id
    LIMIT batch_limit
  ),
  ins AS (
    INSERT INTO public.price_history (
      product_id, store_id, price_cents, before_price_cents,
      is_on_sale, snapshot_date
    )
    SELECT
      product_id,
      store_id,
      price_cents,
      before_price_cents,
      is_on_sale,
      CURRENT_DATE
    FROM batch
    ON CONFLICT (product_id, store_id, snapshot_date) DO UPDATE
      SET
        price_cents = EXCLUDED.price_cents,
        before_price_cents = EXCLUDED.before_price_cents,
        is_on_sale = EXCLUDED.is_on_sale
    RETURNING product_id
  )
  SELECT
    COUNT(*)::integer,
    (ARRAY_AGG(product_id ORDER BY product_id DESC))[1]
  INTO rows_inserted, last_id
  FROM ins;

  RETURN jsonb_build_object(
    'rows_affected', COALESCE(rows_inserted, 0),
    'last_product_id', last_id,
    'done', last_id IS NULL OR COALESCE(rows_inserted, 0) < batch_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_price_history_batch(text, uuid, integer)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.snapshot_price_history_batch(text, uuid, integer)
  TO service_role;

COMMENT ON FUNCTION public.snapshot_price_history_batch(text, uuid, integer) IS
  'Paged snapshot of product_offers into price_history for one store + CURRENT_DATE. service_role only.';
