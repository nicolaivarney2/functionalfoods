-- Goma-primary strategi (jul 2026): native scrape for Salling/REMA, Goma for resten.
-- Tjek udgår fra dagligvarer når p_goma_primary=true.
--
-- Fixes:
--   - Skjul alle tjek:* rækker når Goma er primær
--   - Goma fuldt-katalog (Nemlig, MENY, Spar, Min Købmand) tæller med i tilbudsvisning
--   - Legacy p_goma_primary=false bevarer Tjek-fallback (nød)

DROP FUNCTION IF EXISTS public.get_product_counts_v2();
DROP FUNCTION IF EXISTS public.get_product_counts_v2(boolean);
DROP FUNCTION IF EXISTS public.get_product_counts_v2(boolean, boolean);

CREATE OR REPLACE FUNCTION public.get_product_counts_v2(
  filter_food_only boolean DEFAULT true,
  p_goma_primary boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
SET statement_timeout = '25s'
AS $$
  WITH food_departments AS (
    SELECT unnest(ARRAY[
      'Frugt og grønt', 'Frugt & grønt',
      'Brød og kager', 'Brød', 'Kager', 'Brød & Bavinchi',
      'Drikkevarer', 'Drikke',
      'Kød og fisk', 'Kød & fisk', 'Kød, fisk & fjerkræ', 'Kød',
      'Kolonial',
      'Mejeri og køl', 'Mejeri & køl', 'Mejeri', 'Køl', 'Ost m.v.',
      'Nemt og hurtigt', 'Nemt & hurtigt',
      'Slik og snacks', 'Slik & snacks', 'Slik',
      'Frost', 'Kiosk',
      'Mad fra hele verden'
    ]::text[]) AS dept
  ),
  goma_offers_only_stores AS (
    SELECT unnest(ARRAY[
      'lidl', '365discount', 'kvickly', 'superbrugsen', 'brugsen',
      'loevbjerg', 'abc-lavpris'
    ]::text[]) AS store_id
  ),
  goma_full_catalog_stores AS (
    SELECT unnest(ARRAY[
      'meny', 'spar', 'min-koebmand', 'nemlig'
    ]::text[]) AS store_id
  ),
  per_bucket AS (
    SELECT
      COALESCE(
        NULLIF(TRIM(prod.department), ''),
        NULLIF(TRIM(prod.category), ''),
        'Ukategoriseret'
      ) AS bucket,
      COUNT(*)::bigint AS cnt,
      COUNT(*) FILTER (
        WHERE po.current_price > 0
          AND (po.sale_valid_to IS NULL OR po.sale_valid_to >= now())
          AND (
            (po.normal_price IS NOT NULL AND po.normal_price > po.current_price + 0.01)
            OR (NOT p_goma_primary AND po.source LIKE 'tjek%')
            OR (
              p_goma_primary
              AND po.source = 'goma'
              AND po.store_id IN (SELECT store_id FROM goma_offers_only_stores)
            )
            OR (
              p_goma_primary
              AND po.source = 'goma'
              AND po.store_id IN (SELECT store_id FROM goma_full_catalog_stores)
              AND po.is_on_sale = true
            )
          )
      )::bigint AS offer_cnt
    FROM public.product_offers po
    INNER JOIN public.products prod ON prod.id = po.product_id
    WHERE po.is_available = true
      AND (
        (NOT p_goma_primary AND po.source IS DISTINCT FROM 'goma')
        OR (p_goma_primary AND po.source NOT LIKE 'tjek%')
      )
      AND (
        NOT filter_food_only
        OR prod.department IN (SELECT dept FROM food_departments)
        OR (NOT p_goma_primary AND po.source LIKE 'tjek%')
      )
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'total', COALESCE((SELECT SUM(cnt) FROM per_bucket), 0),
    'offers', COALESCE((SELECT SUM(offer_cnt) FROM per_bucket), 0),
    'categories', COALESCE(
      (SELECT jsonb_object_agg(bucket, cnt) FROM per_bucket),
      '{}'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_product_counts_v2(boolean, boolean) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_food_offers_v2(boolean, integer, integer, text[]);
DROP FUNCTION IF EXISTS public.get_food_offers_v2(boolean, integer, integer, text[], boolean);
DROP FUNCTION IF EXISTS public.get_food_offers_v2(boolean, integer, integer, text[], boolean, boolean);

CREATE OR REPLACE FUNCTION public.get_food_offers_v2(
  p_offers_only boolean DEFAULT true,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_stores text[] DEFAULT NULL,
  p_organic_only boolean DEFAULT false,
  p_goma_primary boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
SET statement_timeout = '25s'
AS $$
  WITH food_departments AS (
    SELECT unnest(ARRAY[
      'Frugt og grønt', 'Frugt & grønt',
      'Brød og kager', 'Brød', 'Kager', 'Brød & Bavinchi',
      'Drikkevarer', 'Drikke',
      'Kød og fisk', 'Kød & fisk', 'Kød, fisk & fjerkræ', 'Kød',
      'Kolonial',
      'Mejeri og køl', 'Mejeri & køl', 'Mejeri', 'Køl', 'Ost m.v.',
      'Nemt og hurtigt', 'Nemt & hurtigt',
      'Slik og snacks', 'Slik & snacks', 'Slik',
      'Frost', 'Kiosk',
      'Mad fra hele verden'
    ]::text[]) AS dept
  ),
  goma_offers_only_stores AS (
    SELECT unnest(ARRAY[
      'lidl', '365discount', 'kvickly', 'superbrugsen', 'brugsen',
      'loevbjerg', 'abc-lavpris'
    ]::text[]) AS store_id
  ),
  goma_full_catalog_stores AS (
    SELECT unnest(ARRAY[
      'meny', 'spar', 'min-koebmand', 'nemlig'
    ]::text[]) AS store_id
  ),
  filtered AS (
    SELECT
      po.id,
      po.product_id,
      po.store_id,
      po.name_store,
      po.product_url,
      po.current_price,
      po.normal_price,
      po.currency,
      po.discount_percentage,
      po.price_per_unit,
      po.price_per_kilogram,
      po.sale_valid_to,
      po.source,
      prod.name_generic,
      prod.brand,
      prod.category,
      prod.subcategory,
      prod.department,
      prod.unit,
      prod.amount,
      prod.image_url,
      (po.current_price > 0
        AND (po.sale_valid_to IS NULL OR po.sale_valid_to >= now())
        AND (
          (po.normal_price IS NOT NULL AND po.normal_price > po.current_price + 0.01)
          OR (NOT p_goma_primary AND po.source LIKE 'tjek%')
          OR (
            p_goma_primary
            AND po.source = 'goma'
            AND po.store_id IN (SELECT store_id FROM goma_offers_only_stores)
          )
          OR (
            p_goma_primary
            AND po.source = 'goma'
            AND po.store_id IN (SELECT store_id FROM goma_full_catalog_stores)
            AND po.is_on_sale = true
          )
        )) AS is_real_offer
    FROM public.product_offers po
    INNER JOIN public.products prod ON prod.id = po.product_id
    WHERE po.is_available = true
      AND (
        (NOT p_goma_primary AND po.source IS DISTINCT FROM 'goma')
        OR (p_goma_primary AND po.source NOT LIKE 'tjek%')
      )
      AND (
        prod.department IN (SELECT dept FROM food_departments)
        OR (NOT p_goma_primary AND po.source LIKE 'tjek%')
      )
      AND (p_stores IS NULL OR po.store_id = ANY(p_stores))
      AND (
        NOT p_organic_only
        OR prod.organic_tags && ARRAY['organic-priority','organic-animal']::text[]
      )
      AND (
        NOT p_offers_only
        OR (
          po.current_price > 0
          AND (po.sale_valid_to IS NULL OR po.sale_valid_to >= now())
          AND (
            (po.normal_price IS NOT NULL AND po.normal_price > po.current_price + 0.01)
            OR (NOT p_goma_primary AND po.source LIKE 'tjek%')
            OR (
              p_goma_primary
              AND po.source = 'goma'
              AND po.store_id IN (SELECT store_id FROM goma_offers_only_stores)
            )
            OR (
              p_goma_primary
              AND po.source = 'goma'
              AND po.store_id IN (SELECT store_id FROM goma_full_catalog_stores)
              AND po.is_on_sale = true
            )
          )
        )
      )
    ORDER BY
      discount_percentage DESC NULLS LAST,
      current_price ASC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) FROM filtered;
$$;

GRANT EXECUTE ON FUNCTION public.get_food_offers_v2(boolean, integer, integer, text[], boolean, boolean) TO anon, authenticated, service_role;
