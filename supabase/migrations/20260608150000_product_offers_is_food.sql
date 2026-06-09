-- Denormalize is_food onto product_offers for fast counts/filters (no slow join via PostgREST).

ALTER TABLE public.product_offers
  ADD COLUMN IF NOT EXISTS is_food boolean NOT NULL DEFAULT true;

UPDATE public.product_offers AS po
SET is_food = p.is_food
FROM public.products AS p
WHERE p.id = po.product_id
  AND po.is_food IS DISTINCT FROM p.is_food;

CREATE INDEX IF NOT EXISTS idx_product_offers_food_available
  ON public.product_offers (is_available, is_food, is_offer_active)
  WHERE is_available = true;

CREATE OR REPLACE FUNCTION public.sync_product_offer_is_food()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT p.is_food INTO NEW.is_food
  FROM public.products p
  WHERE p.id = NEW.product_id;
  IF NEW.is_food IS NULL THEN
    NEW.is_food := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_offer_is_food ON public.product_offers;
CREATE TRIGGER trg_sync_product_offer_is_food
  BEFORE INSERT OR UPDATE OF product_id ON public.product_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_offer_is_food();

CREATE OR REPLACE FUNCTION public.sync_offers_when_product_food_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_food IS DISTINCT FROM OLD.is_food THEN
    UPDATE public.product_offers
    SET is_food = NEW.is_food
    WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_offers_on_product_food ON public.products;
CREATE TRIGGER trg_sync_offers_on_product_food
  AFTER UPDATE OF is_food ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_offers_when_product_food_changes();

-- Fast counts RPC (single table scan on product_offers)
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
    SELECT
      po.is_offer_active,
      COALESCE(
        NULLIF(TRIM(p.department), ''),
        NULLIF(TRIM(p.category), ''),
        'Ukategoriseret'
      ) AS bucket
    FROM public.product_offers po
    LEFT JOIN public.products p ON p.id = po.product_id
    WHERE po.is_available = true
      AND (NOT filter_food_only OR po.is_food = true)
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
      ) cat_counts
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_product_counts_v2(boolean) TO anon, authenticated, service_role;
