-- Tjek overlay for Salling papiravis (Føtex/Netto/Bilka slagtervarer).
-- Salling Algolia (`prod_FOETEX_PRODUCTS` m.fl.) har ikke vejevarer som
-- "Ovnklar flæskesteg"; Tjek OCR'er tilbudsavisen. Goma forbliver primær
-- for Lidl/Coop/MENY — kun overlay-store_ids vises som tjek% når p_goma_primary.

DROP FUNCTION IF EXISTS public.get_food_offers_v2(boolean, integer, integer, text[], boolean, boolean, text[], text, text[]);
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
      'Kød og fisk', 'Kød & fisk', 'Kød, fisk & fjerkræ', 'Kød',
      'Kolonial',
      'Mejeri og køl', 'Mejeri & køl', 'Mejeri', 'Køl', 'Ost m.v.',
      'Nemt og hurtigt', 'Nemt & hurtigt',
      'Slik og snacks', 'Slik & snacks', 'Slik',
      'Frost', 'Kiosk',
      'Mad fra hele verden'
    ]::text[]) AS dept
  ),
  store_named_departments AS (
    SELECT unnest(ARRAY[
      'Lidl', 'SPAR', 'Spar', 'SuperBrugsen', '365discount', 'Løvbjerg',
      'Kvickly', 'Brugsen', 'ABC Lavpris', 'MENY', 'Nemlig', 'Min Købmand',
      'Diverse', 'Not Categorized',
      'Føtex', 'føtex', 'Netto', 'Bilka'
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
  tjek_overlay_stores AS (
    SELECT unnest(ARRAY[
      'netto', 'foetex', 'bilka'
    ]::text[]) AS store_id
  ),
  per_bucket AS (
    SELECT
      CASE
        WHEN prod.department IN (SELECT dept FROM food_departments) THEN prod.department
        WHEN prod.category IN (SELECT dept FROM food_departments) THEN prod.category
        ELSE COALESCE(
          NULLIF(TRIM(prod.category), ''),
          NULLIF(TRIM(prod.subcategory), ''),
          NULLIF(TRIM(prod.department), ''),
          'Ukategoriseret'
        )
      END AS bucket,
      COUNT(*)::bigint AS cnt,
      COUNT(*) FILTER (
        WHERE po.current_price > 0
          AND (po.sale_valid_to IS NULL OR po.sale_valid_to >= now())
          AND (
            po.is_on_sale = true
            OR (po.normal_price IS NOT NULL AND po.normal_price > po.current_price + 0.01)
            OR (
              po.source LIKE 'tjek%'
              AND (
                NOT p_goma_primary
                OR po.store_id IN (SELECT store_id FROM tjek_overlay_stores)
              )
            )
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
        OR (
          po.source LIKE 'tjek%'
          AND po.store_id IN (SELECT store_id FROM tjek_overlay_stores)
        )
      )
      AND (
        NOT filter_food_only
        OR prod.department IN (SELECT dept FROM food_departments)
        OR prod.category IN (SELECT dept FROM food_departments)
        OR prod.department IN (SELECT dept FROM store_named_departments)
        OR (
          po.source LIKE 'tjek%'
          AND (
            NOT p_goma_primary
            OR po.store_id IN (SELECT store_id FROM tjek_overlay_stores)
          )
        )
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

CREATE OR REPLACE FUNCTION public.get_food_offers_v2(
  p_offers_only boolean DEFAULT true,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_stores text[] DEFAULT NULL,
  p_organic_only boolean DEFAULT false,
  p_goma_primary boolean DEFAULT true,
  p_product_ids text[] DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_department_patterns text[] DEFAULT NULL
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
      'Kød og fisk', 'Kød & fisk', 'Kød, fisk & fjerkræ', 'Kød',
      'Kolonial',
      'Mejeri og køl', 'Mejeri & køl', 'Mejeri', 'Køl', 'Ost m.v.',
      'Nemt og hurtigt', 'Nemt & hurtigt',
      'Slik og snacks', 'Slik & snacks', 'Slik',
      'Frost', 'Kiosk',
      'Mad fra hele verden'
    ]::text[]) AS dept
  ),
  store_named_departments AS (
    SELECT unnest(ARRAY[
      'Lidl', 'SPAR', 'Spar', 'SuperBrugsen', '365discount', 'Løvbjerg',
      'Kvickly', 'Brugsen', 'ABC Lavpris', 'MENY', 'Nemlig', 'Min Købmand',
      'Diverse', 'Not Categorized',
      'Føtex', 'føtex', 'Netto', 'Bilka'
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
  tjek_overlay_stores AS (
    SELECT unnest(ARRAY[
      'netto', 'foetex', 'bilka'
    ]::text[]) AS store_id
  ),
  search_term AS (
    SELECT
      NULLIF(trim(p_search), '') AS term,
      NULLIF(
        regexp_replace(lower(trim(coalesce(p_search, ''))), '[^a-z0-9æøåäöü]+', '', 'g'),
        ''
      ) AS term_folded
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
      -- Uden disse to falder isRealOfferFields() i database-service tilbage til
      -- false for native katalogkæder, og /dagligvarer?offers=true bliver tom
      -- for Netto/Føtex/Bilka/REMA/MENY selvom rækkerne er på tilbud.
      po.is_on_sale,
      po.is_offer_active,
      prod.ean,
      prod.name_generic,
      prod.brand,
      prod.category,
      prod.subcategory,
      prod.department,
      prod.unit,
      prod.amount,
      prod.image_url
    FROM public.product_offers po
    INNER JOIN public.products prod ON prod.id = po.product_id
    CROSS JOIN search_term st
    WHERE po.is_available = true
      AND (
        (NOT p_goma_primary AND po.source IS DISTINCT FROM 'goma')
        OR (p_goma_primary AND po.source NOT LIKE 'tjek%')
        OR (
          po.source LIKE 'tjek%'
          AND po.store_id IN (SELECT store_id FROM tjek_overlay_stores)
        )
      )
      AND (
        prod.department IN (SELECT dept FROM food_departments)
        OR prod.category IN (SELECT dept FROM food_departments)
        OR prod.department IN (SELECT dept FROM store_named_departments)
        OR (
          po.source LIKE 'tjek%'
          AND (
            NOT p_goma_primary
            OR po.store_id IN (SELECT store_id FROM tjek_overlay_stores)
          )
        )
      )
      AND (
        p_stores IS NULL
        OR cardinality(p_stores) = 0
        OR po.store_id = ANY(p_stores)
      )
      AND (
        p_product_ids IS NULL
        OR cardinality(p_product_ids) = 0
        OR po.product_id = ANY(p_product_ids)
      )
      AND (
        p_department_patterns IS NULL
        OR cardinality(p_department_patterns) = 0
        OR EXISTS (
          SELECT 1
          FROM unnest(p_department_patterns) AS pat(pattern)
          WHERE prod.department ILIKE pat.pattern
             OR (
               prod.department NOT IN (SELECT dept FROM food_departments)
               AND (
                 prod.category ILIKE pat.pattern
                 OR prod.subcategory ILIKE pat.pattern
                 OR prod.category ILIKE '%' || pat.pattern || '%'
                 OR prod.subcategory ILIKE '%' || pat.pattern || '%'
               )
             )
        )
      )
      AND (
        NOT p_organic_only
        OR prod.organic_tags && ARRAY['organic-priority','organic-animal']::text[]
      )
      AND (
        st.term IS NULL
        OR po.name_store ILIKE '%' || st.term || '%'
        OR prod.name_generic ILIKE '%' || st.term || '%'
        OR prod.brand ILIKE '%' || st.term || '%'
        OR prod.department ILIKE '%' || st.term || '%'
        OR prod.category ILIKE '%' || st.term || '%'
        OR prod.subcategory ILIKE '%' || st.term || '%'
        OR (
          st.term_folded IS NOT NULL
          AND (
            regexp_replace(lower(coalesce(po.name_store, '')), '[^a-z0-9æøåäöü]+', '', 'g')
              LIKE '%' || st.term_folded || '%'
            OR regexp_replace(lower(coalesce(prod.name_generic, '')), '[^a-z0-9æøåäöü]+', '', 'g')
              LIKE '%' || st.term_folded || '%'
            OR regexp_replace(lower(coalesce(prod.brand, '')), '[^a-z0-9æøåäöü]+', '', 'g')
              LIKE '%' || st.term_folded || '%'
          )
        )
      )
      AND (
        NOT p_offers_only
        OR (
          po.current_price > 0
          AND (po.sale_valid_to IS NULL OR po.sale_valid_to >= now())
          AND (
            po.is_on_sale = true
            OR (po.normal_price IS NOT NULL AND po.normal_price > po.current_price + 0.01)
            OR (
              po.source LIKE 'tjek%'
              AND (
                NOT p_goma_primary
                OR po.store_id IN (SELECT store_id FROM tjek_overlay_stores)
              )
            )
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
      po.discount_percentage DESC NULLS LAST,
      po.current_price ASC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) FROM filtered;
$$;

GRANT EXECUTE ON FUNCTION public.get_food_offers_v2(boolean, integer, integer, text[], boolean, boolean, text[], text, text[]) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_food_offers_v2(boolean, integer, integer, text[], boolean, boolean, text[], text, text[]) IS
  'Dagligvarer offers. Department-first category filter; store-named Goma departments fall back to category/subcategory; search folds hyphens.';
