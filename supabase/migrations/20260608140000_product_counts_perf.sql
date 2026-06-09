-- Speed up get_product_counts_v2 (was timing out from API → sidebar showed 0).

CREATE INDEX IF NOT EXISTS idx_product_offers_available_active
  ON public.product_offers (is_available, is_offer_active)
  WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_product_offers_available_product
  ON public.product_offers (product_id)
  WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_products_is_food_true
  ON public.products (id)
  WHERE is_food = true;

DROP FUNCTION IF EXISTS public.get_product_counts_v2();
DROP FUNCTION IF EXISTS public.get_product_counts_v2(boolean);

CREATE OR REPLACE FUNCTION public.get_product_counts_v2(filter_food_only boolean DEFAULT true)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
SET statement_timeout = '25s'
AS $$
  WITH base AS MATERIALIZED (
    SELECT
      po.is_offer_active,
      COALESCE(
        NULLIF(TRIM(prod.department), ''),
        NULLIF(TRIM(prod.category), ''),
        'Ukategoriseret'
      ) AS bucket
    FROM public.product_offers po
    INNER JOIN public.products prod ON prod.id = po.product_id
    WHERE po.is_available = true
      AND (NOT filter_food_only OR prod.is_food = true)
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*)::bigint FROM base),
    'offers', (SELECT COUNT(*)::bigint FROM base WHERE is_offer_active = true),
    'categories', (
      SELECT COALESCE(jsonb_object_agg(bucket, cnt), '{}'::jsonb)
      FROM (
        SELECT bucket, COUNT(*)::bigint AS cnt
        FROM base
        GROUP BY bucket
      ) AS cat_counts
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_product_counts_v2(boolean) TO anon, authenticated, service_role;
