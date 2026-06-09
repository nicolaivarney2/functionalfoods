-- Preview before backfilling products.is_food.
-- Self-contained: creates the classifier function first (no table changes), then SELECT only.

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

-- ─── Read-only preview ───────────────────────────────────────────────────────

SELECT
  COUNT(*) FILTER (
    WHERE public.is_food_catalog_product(department, category, subcategory, name_generic)
  ) AS would_be_food,
  COUNT(*) FILTER (
    WHERE NOT public.is_food_catalog_product(department, category, subcategory, name_generic)
  ) AS would_be_non_food,
  COUNT(*) AS total_products
FROM public.products;

SELECT id, department, category, name_generic
FROM public.products
WHERE NOT public.is_food_catalog_product(department, category, subcategory, name_generic)
LIMIT 20;
