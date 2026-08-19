-- Speeds up incremental fooddata → app price_history import.
-- Apply in grocery Supabase SQL editor, or via:
--   npx tsx scripts/grocery-migrate.ts
-- (same body as src/grocery/db/migrations/007_price_history_snapshot_date_index.sql)

CREATE INDEX IF NOT EXISTS idx_history_snapshot_date_id
  ON public.price_history (snapshot_date, id);

CREATE OR REPLACE FUNCTION public.price_history_since_page(
  p_since date,
  p_after_date date DEFAULT NULL,
  p_after_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 1000
)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  store_id text,
  price_cents integer,
  before_price_cents integer,
  is_on_sale boolean,
  snapshot_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
  SELECT
    h.id,
    h.product_id,
    h.store_id,
    h.price_cents,
    h.before_price_cents,
    h.is_on_sale,
    h.snapshot_date
  FROM public.price_history h
  WHERE h.snapshot_date >= p_since
    AND (
      p_after_date IS NULL
      OR (h.snapshot_date, h.id) > (p_after_date, p_after_id)
    )
  ORDER BY h.snapshot_date, h.id
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 1000), 2000));
$$;

REVOKE ALL ON FUNCTION public.price_history_since_page(date, date, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.price_history_since_page(date, date, uuid, integer)
  TO service_role;

COMMENT ON FUNCTION public.price_history_since_page(date, date, uuid, integer) IS
  'Paged price_history rows since p_since for fooddata→app import. service_role only.';
