-- Fast product counts for Dagligvarer (one round-trip instead of 50+ batched selects).
-- Run this in Supabase SQL Editor (or via migration) before relying on the RPC path.
-- Safe to run multiple times (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.get_product_counts_v2()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', (
      SELECT COUNT(*)::bigint
      FROM product_offers
      WHERE is_available = true
    ),
    'offers', (
      SELECT COUNT(*)::bigint
      FROM product_offers
      WHERE is_available = true
        AND is_offer_active = true
    ),
    'categories', (
      SELECT COALESCE(jsonb_object_agg(bucket, cnt), '{}'::jsonb)
      FROM (
        SELECT
          COALESCE(
            NULLIF(TRIM(p.department), ''),
            NULLIF(TRIM(p.category), ''),
            'Ukategoriseret'
          ) AS bucket,
          COUNT(*)::bigint AS cnt
        FROM product_offers po
        LEFT JOIN products p ON p.id = po.product_id
        WHERE po.is_available = true
        GROUP BY 1
      ) AS cat_counts
    )
  );
$$;

COMMENT ON FUNCTION public.get_product_counts_v2() IS
  'Aggregated product_offers counts for Dagligvarer UI (total, active offers, per department/category).';

GRANT EXECUTE ON FUNCTION public.get_product_counts_v2() TO anon, authenticated, service_role;
