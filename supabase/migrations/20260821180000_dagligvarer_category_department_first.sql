-- /dagligvarer kategori-filter: match department først.
--
-- Tidligere matchedes p_department_patterns mod BÅDE department OG category.
-- Bilka To Go lægger fersk kød i department='Kød & fisk' og frostvarer i
-- department='Frost' med category='Kød & fisk'. Filteret "Kød og fisk" ramte
-- derfor frost-nuggets/rejer (billige, høj rabat) og skubbede kyllingeinderfilet
-- ud — eller viste en liste der ikke lignede kød-kategorien.
--
-- Category/subcategory bruges kun når department IKKE er en kendt fødevare-
-- afdeling (Goma/Tjek hvor department kan være butiksnavn).

DROP FUNCTION IF EXISTS public.get_food_offers_v2(boolean, integer, integer, text[], boolean, boolean, text[], text, text[]);

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
  search_term AS (
    SELECT NULLIF(trim(p_search), '') AS term
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
      )
      AND (
        prod.department IN (SELECT dept FROM food_departments)
        OR (NOT p_goma_primary AND po.source LIKE 'tjek%')
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
      po.discount_percentage DESC NULLS LAST,
      po.current_price ASC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) FROM filtered;
$$;

GRANT EXECUTE ON FUNCTION public.get_food_offers_v2(boolean, integer, integer, text[], boolean, boolean, text[], text, text[]) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_food_offers_v2(boolean, integer, integer, text[], boolean, boolean, text[], text, text[]) IS
  'Dagligvarer offers. Category filter matches products.department first; category/subcategory only when department is not a known food department.';
