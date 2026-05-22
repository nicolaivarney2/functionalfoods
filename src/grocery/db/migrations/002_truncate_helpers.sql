-- =====================================================================
-- Maintenance: truncate helper RPC for dev/admin use.
-- =====================================================================
-- A TRUNCATE on `products` cascades to `product_offers` and `price_history`
-- which is exactly what we want when wiping a chain's data for re-sync.
--
-- This is intentionally `SECURITY DEFINER` so it bypasses RLS but the
-- function body filters by `source_chain` to keep blast radius bounded.

CREATE OR REPLACE FUNCTION public.truncate_chain(p_chain text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5min'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF p_chain IS NULL OR length(p_chain) < 2 THEN
    RAISE EXCEPTION 'chain must be specified';
  END IF;

  DELETE FROM public.products WHERE source_chain = p_chain;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Lock it down: only service_role can call it.
REVOKE ALL ON FUNCTION public.truncate_chain(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.truncate_chain(text) TO service_role;

COMMENT ON FUNCTION public.truncate_chain(text) IS
  'Delete all products (and cascading offers/history) for a given source_chain. service_role only.';
