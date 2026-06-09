-- Food-only product counts for /dagligvarer (excludes non-food departments).
-- Replaces unfiltered get_product_counts_v2() which scanned ~160k offers.
--
-- Note: parameter must NOT be named p_* — alias `p` on products makes PostgreSQL
-- parse p_food_only as column p.food_only.

DROP FUNCTION IF EXISTS public.get_product_counts_v2();

CREATE OR REPLACE FUNCTION public.get_product_counts_v2(filter_food_only boolean DEFAULT true)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH food_departments AS (
    SELECT unnest(ARRAY[
      'Frugt og grønt', 'Frugt & grønt',
      'Brød og kager', 'Brød & Bavinchi', 'Brød',
      'Kød og fisk', 'Kød & fisk', 'Kød, fisk & fjerkræ',
      'Kolonial',
      'Mejeri og køl', 'Mejeri & køl', 'Mejeri', 'Køl', 'Ost m.v.',
      'Frost',
      'Drikkevarer', 'Drikke',
      'Slik og snacks', 'Slik & snacks', 'Slik',
      'Kiosk',
      'Nemt og hurtigt', 'Nemt & hurtigt',
      'Mad fra hele verden'
    ]::text[]) AS dept
  ),
  base AS (
    SELECT po.*, prod.department, prod.category
    FROM product_offers po
    INNER JOIN products prod ON prod.id = po.product_id
    WHERE po.is_available = true
      AND (
        NOT filter_food_only
        OR prod.department IN (SELECT dept FROM food_departments)
      )
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*)::bigint FROM base),
    'offers', (
      SELECT COUNT(*)::bigint
      FROM base
      WHERE is_offer_active = true
    ),
    'categories', (
      SELECT COALESCE(jsonb_object_agg(bucket, cnt), '{}'::jsonb)
      FROM (
        SELECT
          COALESCE(
            NULLIF(TRIM(department), ''),
            NULLIF(TRIM(category), ''),
            'Ukategoriseret'
          ) AS bucket,
          COUNT(*)::bigint AS cnt
        FROM base
        GROUP BY 1
      ) AS cat_counts
    )
  );
$$;

COMMENT ON FUNCTION public.get_product_counts_v2(boolean) IS
  'Aggregated product_offers counts for Dagligvarer. filter_food_only=true excludes non-food departments.';

GRANT EXECUTE ON FUNCTION public.get_product_counts_v2(boolean) TO anon, authenticated, service_role;
