-- Goma og Tjek må ikke bruges som kilde.
-- Eksisterende tilbudsrækker slås fra, billed-URL'er hos de værter nulstilles,
-- og de offentlige funktioner udelader kilderne.
-- Skal matche src/lib/goma-import-stores.ts og src/lib/catalog-image-url.ts.

CREATE TABLE IF NOT EXISTS public.catalog_image_aliases (
  id text PRIMARY KEY,
  upstream_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_image_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_image_aliases FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.catalog_image_aliases TO service_role;

CREATE OR REPLACE FUNCTION public.catalog_image_alias_id(p_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT left(encode(sha256(convert_to(p_url, 'UTF8')), 'hex'), 32);
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_image_alias_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_image_alias_id(text) TO service_role;

CREATE OR REPLACE FUNCTION public.ff_public_catalog_image_url(p_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_url IS NULL OR btrim(p_url) = '' THEN p_url
    WHEN p_url LIKE '%/api/images/catalog/g/%'
      OR p_url LIKE '%/api/images/catalog/e/%'
      OR p_url LIKE '%/api/images/catalog/a/%'
      OR p_url LIKE '%tjek.com%'
      OR p_url LIKE '%goma.gg%'
      OR p_url LIKE '%etilbudsavis%' THEN NULL
    ELSE p_url
  END;
$$;

GRANT EXECUTE ON FUNCTION public.ff_public_catalog_image_url(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.product_offers_hide_upstream_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.source) = 'goma' THEN
    NEW.source := 'catalog';
  ELSIF lower(NEW.source) LIKE 'tjek%' THEN
    NEW.source := 'leaflet' || substr(lower(NEW.source), 5);
  END IF;
  IF NEW.product_url ILIKE '%goma.gg%'
    OR NEW.product_url ILIKE '%tjek.com%'
    OR NEW.product_url ILIKE '%etilbudsavis%' THEN
    NEW.product_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.hide_upstream_catalog_image_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.image_url := public.ff_public_catalog_image_url(NEW.image_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_offers_hide_upstream_source ON public.product_offers;
CREATE TRIGGER trg_product_offers_hide_upstream_source
  BEFORE INSERT OR UPDATE OF source, product_url ON public.product_offers
  FOR EACH ROW EXECUTE FUNCTION public.product_offers_hide_upstream_source();

DROP TRIGGER IF EXISTS trg_products_hide_catalog_image ON public.products;
CREATE TRIGGER trg_products_hide_catalog_image
  BEFORE INSERT OR UPDATE OF image_url ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.hide_upstream_catalog_image_url();

DROP TRIGGER IF EXISTS trg_price_alerts_hide_catalog_image ON public.user_price_alerts;
CREATE TRIGGER trg_price_alerts_hide_catalog_image
  BEFORE INSERT OR UPDATE OF image_url ON public.user_price_alerts
  FOR EACH ROW EXECUTE FUNCTION public.hide_upstream_catalog_image_url();

DROP TRIGGER IF EXISTS trg_manual_items_hide_catalog_image ON public.user_manual_shopping_items;
CREATE TRIGGER trg_manual_items_hide_catalog_image
  BEFORE INSERT OR UPDATE OF image_url ON public.user_manual_shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.hide_upstream_catalog_image_url();

INSERT INTO public.catalog_image_aliases (id, upstream_url)
SELECT DISTINCT public.catalog_image_alias_id(image_url), image_url
FROM (
  SELECT image_url FROM public.products
  UNION ALL SELECT image_url FROM public.user_price_alerts
  UNION ALL SELECT image_url FROM public.user_manual_shopping_items
) urls
WHERE image_url LIKE '%tjek.com%'
   OR image_url LIKE '%etilbudsavis%'
   OR (
     image_url LIKE '%goma.gg%'
     AND image_url NOT LIKE 'https://storage.goma.gg/v1/%'
   )
ON CONFLICT (id) DO NOTHING;

UPDATE public.products
SET image_url = public.ff_public_catalog_image_url(image_url)
WHERE image_url LIKE '%goma.gg%'
   OR image_url LIKE '%tjek.com%'
   OR image_url LIKE '%etilbudsavis%';

UPDATE public.user_price_alerts
SET image_url = public.ff_public_catalog_image_url(image_url)
WHERE image_url LIKE '%goma.gg%'
   OR image_url LIKE '%tjek.com%'
   OR image_url LIKE '%etilbudsavis%';

UPDATE public.user_manual_shopping_items
SET image_url = public.ff_public_catalog_image_url(image_url)
WHERE image_url LIKE '%goma.gg%'
   OR image_url LIKE '%tjek.com%'
   OR image_url LIKE '%etilbudsavis%';

UPDATE public.product_offers
SET product_url = NULL
WHERE product_url ILIKE '%goma.gg%'
   OR product_url ILIKE '%tjek.com%'
   OR product_url ILIKE '%etilbudsavis%';

UPDATE public.product_offers
SET source = 'catalog'
WHERE lower(source) = 'goma';

UPDATE public.product_offers
SET source = 'leaflet' || substr(lower(source), 5)
WHERE lower(source) LIKE 'tjek%';

UPDATE public.product_offers
SET
  is_available = false,
  is_on_sale = false,
  is_offer_active = false,
  normal_price = NULL,
  discount_percentage = NULL
WHERE lower(coalesce(source, '')) IN ('goma', 'catalog')
   OR lower(source) LIKE 'tjek%'
   OR lower(source) LIKE 'leaflet%';

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
          )
      )::bigint AS offer_cnt
    FROM public.product_offers po
    INNER JOIN public.products prod ON prod.id = po.product_id
    WHERE po.is_available = true
      AND lower(coalesce(po.source, '')) NOT IN ('goma', 'catalog')
      AND lower(coalesce(po.source, '')) NOT LIKE 'tjek%'
      AND lower(coalesce(po.source, '')) NOT LIKE 'leaflet%'
      AND (
        NOT filter_food_only
        OR prod.department IN (SELECT dept FROM food_departments)
        OR prod.category IN (SELECT dept FROM food_departments)
        OR prod.department IN (SELECT dept FROM store_named_departments)
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
      CASE
        WHEN po.product_url ILIKE '%goma.gg%'
          OR po.product_url ILIKE '%tjek.com%'
          OR po.product_url ILIKE '%etilbudsavis%'
        THEN NULL
        ELSE po.product_url
      END AS product_url,
      po.current_price,
      po.normal_price,
      po.currency,
      po.discount_percentage,
      po.price_per_unit,
      po.price_per_kilogram,
      po.sale_valid_to,
      CASE
        WHEN lower(po.source) = 'goma' OR lower(po.source) = 'catalog' THEN 'catalog'
        WHEN lower(po.source) LIKE 'tjek%' THEN 'leaflet' || substr(lower(po.source), 5)
        WHEN lower(po.source) LIKE 'leaflet%' THEN lower(po.source)
        ELSE po.source
      END AS source,
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
      public.ff_public_catalog_image_url(prod.image_url) AS image_url
    FROM public.product_offers po
    INNER JOIN public.products prod ON prod.id = po.product_id
    CROSS JOIN search_term st
    WHERE po.is_available = true
      AND lower(coalesce(po.source, '')) NOT IN ('goma', 'catalog')
      AND lower(coalesce(po.source, '')) NOT LIKE 'tjek%'
      AND lower(coalesce(po.source, '')) NOT LIKE 'leaflet%'
      AND (
        prod.department IN (SELECT dept FROM food_departments)
        OR prod.category IN (SELECT dept FROM food_departments)
        OR prod.department IN (SELECT dept FROM store_named_departments)
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
