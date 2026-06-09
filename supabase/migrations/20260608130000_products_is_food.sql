-- Classify products as food vs non-food for /dagligvarer (block-list: include unless explicitly non-food).
-- Fixes 0 counts when department is NULL or uses store-specific labels outside a narrow whitelist.
--
-- SAFE TO RUN: adds one column + backfills it. Does NOT delete products or offers.
-- Supabase may warn about UPDATE — step 3 only touches rows where is_food changes.

-- ─── Step 1: function + column (non-destructive) ───────────────────────────

CREATE OR REPLACE FUNCTION public.is_food_catalog_product(
  p_department text,
  p_category text,
  p_subcategory text DEFAULT NULL,
  p_name text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  dept text;
  cat text;
  sub text;
  nm text;
  non_food text[] := ARRAY[
    'personlig pleje', 'pleje',
    'bolig & køkken', 'bolig og køkken',
    'tøj & sko', 'tøj',
    'leg', 'fritid & sport', 'elektronik',
    'husholdning', 'husholdning & rengøring',
    'non-food', 'nonfood', 'non food', 'øvrig nonfood',
    'byggemarked', 'have', 'biludstyr', 'dyremad', 'dyr',
    'baby & børn', 'baby og småbørn', 'baby og familie'
  ];
BEGIN
  dept := lower(trim(coalesce(p_department, '')));
  cat := lower(trim(coalesce(p_category, '')));
  sub := lower(trim(coalesce(p_subcategory, '')));
  nm := lower(trim(coalesce(p_name, '')));

  IF nm ~ '\mshampoo\M' OR nm ~ '\mshowergel\M' OR nm ~ '\mtandpasta\M'
     OR nm ~ '\bdeodorant\M' OR nm ~ '\bhundesnack' OR nm ~ '\bhundefoder\M'
     OR nm ~ '\bkattemad\M' OR nm ~ '\bleget[øo]j\M' OR nm ~ '\bstegepande\M'
     OR nm ~ '\bstr[øo]mpe' THEN
    RETURN false;
  END IF;

  IF dept <> '' AND dept = ANY(non_food) THEN RETURN false; END IF;
  IF cat <> '' AND cat = ANY(non_food) THEN RETURN false; END IF;
  IF sub <> '' AND sub = ANY(non_food) THEN RETURN false; END IF;

  RETURN true;
END;
$$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_food boolean NOT NULL DEFAULT true;

-- ─── Step 2 (optional preview — read-only, run alone first if you want) ───
-- SELECT
--   COUNT(*) FILTER (WHERE public.is_food_catalog_product(department, category, subcategory, name_generic)) AS would_be_food,
--   COUNT(*) FILTER (WHERE NOT public.is_food_catalog_product(department, category, subcategory, name_generic)) AS would_be_non_food,
--   COUNT(*) AS total
-- FROM public.products;

-- ─── Step 3: backfill only rows that need a change ─────────────────────────

UPDATE public.products AS p
SET is_food = public.is_food_catalog_product(p.department, p.category, p.subcategory, p.name_generic)
WHERE p.is_food IS DISTINCT FROM public.is_food_catalog_product(p.department, p.category, p.subcategory, p.name_generic);

CREATE INDEX IF NOT EXISTS idx_products_is_food ON public.products (is_food) WHERE is_food = true;

-- ─── Step 4: counts RPC (replaces function definition only — no table data) ─

DROP FUNCTION IF EXISTS public.get_product_counts_v2();
DROP FUNCTION IF EXISTS public.get_product_counts_v2(boolean);

CREATE OR REPLACE FUNCTION public.get_product_counts_v2(filter_food_only boolean DEFAULT true)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT po.*, prod.department, prod.category
    FROM product_offers po
    INNER JOIN products prod ON prod.id = po.product_id
    WHERE po.is_available = true
      AND (NOT filter_food_only OR prod.is_food = true)
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

GRANT EXECUTE ON FUNCTION public.is_food_catalog_product(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_product_counts_v2(boolean) TO anon, authenticated, service_role;
