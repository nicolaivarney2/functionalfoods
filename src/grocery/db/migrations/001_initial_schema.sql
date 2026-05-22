-- =====================================================================
-- Grocery Service: Initial Schema
-- =====================================================================
-- Eget Supabase-projekt: kuwqzodesppknbjtrsgs
-- Adskilt fra functionalfoods hovedprojekt
-- =====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- updated_at trigger helper
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- STORES (kæder + fysiske butikker)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id text PRIMARY KEY,
  chain text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('chain', 'physical')),
  parent_chain text REFERENCES public.stores(id) ON DELETE CASCADE,
  city text,
  zipcode text,
  metadata jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_chain ON public.stores(chain);
CREATE INDEX IF NOT EXISTS idx_stores_type ON public.stores(type);

DROP TRIGGER IF EXISTS stores_updated_at ON public.stores;
CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.stores IS 'Dagligvarekæder og fysiske butikker';

-- =====================================================================
-- PRODUCTS (kanonisk vare)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identifiers
  gtin text,
  -- Names
  name text NOT NULL,
  brand text,
  manufacturer text,
  description text,
  -- Quantity
  amount numeric,
  unit text,
  -- Image
  image_url text,
  -- Categorization
  category_path text,
  category_lvl0 text,
  category_lvl1 text,
  category_lvl2 text,
  -- Provenance
  source_chain text NOT NULL,
  source_id text NOT NULL,
  -- Status
  active boolean DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  -- Debug
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- En vare per source+source_id
  UNIQUE(source_chain, source_id)
);

CREATE INDEX IF NOT EXISTS idx_products_gtin ON public.products(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_source ON public.products(source_chain, source_id);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category_lvl0 ON public.products(category_lvl0);
CREATE INDEX IF NOT EXISTS idx_products_last_seen ON public.products(last_seen_at);

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.products IS 'Kanoniske produkter på tværs af kæder. Unik via source_chain + source_id.';

-- =====================================================================
-- PRODUCT_OFFERS (pris pr. butik pr. produkt - current state)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  -- Pricing (i øre for at undgå floats)
  price_cents integer,
  before_price_cents integer,
  unit_price_cents integer,
  unit_price_unit text,
  -- Offer info
  is_on_sale boolean DEFAULT false,
  offer_from timestamptz,
  offer_until timestamptz,
  offer_description text,
  multibuy text,
  discount_percentage numeric(5,2),
  -- Availability
  in_stock boolean DEFAULT true,
  -- Provenance
  source text NOT NULL,
  source_synced_at timestamptz DEFAULT now(),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_offers_store ON public.product_offers(store_id);
CREATE INDEX IF NOT EXISTS idx_offers_product ON public.product_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_on_sale ON public.product_offers(is_on_sale, store_id) WHERE is_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_offers_in_stock ON public.product_offers(in_stock, store_id) WHERE in_stock = true;
CREATE INDEX IF NOT EXISTS idx_offers_synced ON public.product_offers(source_synced_at);

DROP TRIGGER IF EXISTS product_offers_updated_at ON public.product_offers;
CREATE TRIGGER product_offers_updated_at
  BEFORE UPDATE ON public.product_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.product_offers IS 'Nuværende pris/tilbud pr. produkt pr. butik. Opdateres ved hver sync.';

-- =====================================================================
-- PRICE_HISTORY (snapshots over tid - til pris-historik feature)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  price_cents integer NOT NULL,
  before_price_cents integer,
  is_on_sale boolean DEFAULT false,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, store_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_history_product_date ON public.price_history(product_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_history_store_date ON public.price_history(store_id, snapshot_date DESC);

COMMENT ON TABLE public.price_history IS 'Daglige snapshots af priser. Bruges til pris-historik (som Goma har).';

-- =====================================================================
-- SYNC_LOGS (audit pr. kørsel)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  products_processed integer DEFAULT 0,
  products_created integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  offers_processed integer DEFAULT 0,
  offers_created integer DEFAULT 0,
  offers_updated integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON public.sync_logs(source, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status, started_at DESC);

COMMENT ON TABLE public.sync_logs IS 'Audit log for hver sync-kørsel pr. datakilde.';

-- =====================================================================
-- API_KEYS (for consumer auth - functionalfoods, planomo, mfl.)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] DEFAULT ARRAY['read']::text[],
  rate_limit_per_minute integer DEFAULT 600,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash) WHERE active = true;

COMMENT ON TABLE public.api_keys IS 'API-keys for konsumenter (functionalfoods, planomo, etc.). key_hash er sha256.';

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- Enable RLS på alle tables. Vi accesser kun fra server-side med
-- service_role key, så vi har ingen public policies.
-- Det betyder anon/publishable keys IKKE kan læse direkte fra DB.
-- Alt skal gå gennem vores /api/grocery/* endpoints.

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Ingen policies = ingen public access. Service role bypasser RLS.

-- =====================================================================
-- SEED: Indsæt chain stores
-- =====================================================================
INSERT INTO public.stores (id, chain, name, type) VALUES
  ('netto', 'netto', 'Netto', 'chain'),
  ('foetex', 'foetex', 'Føtex', 'chain'),
  ('bilka', 'bilka', 'Bilka', 'chain'),
  ('rema-1000', 'rema-1000', 'REMA 1000', 'chain'),
  ('nemlig', 'nemlig', 'Nemlig.com', 'chain'),
  ('lidl', 'lidl', 'Lidl', 'chain'),
  ('365discount', '365discount', '365discount', 'chain'),
  ('kvickly', 'kvickly', 'Kvickly', 'chain'),
  ('superbrugsen', 'superbrugsen', 'SuperBrugsen', 'chain'),
  ('brugsen', 'brugsen', 'Brugsen', 'chain'),
  ('meny', 'meny', 'MENY', 'chain'),
  ('spar', 'spar', 'Spar', 'chain'),
  ('loevbjerg', 'loevbjerg', 'Løvbjerg', 'chain'),
  ('abc-lavpris', 'abc-lavpris', 'ABC Lavpris', 'chain'),
  ('min-koebmand', 'min-koebmand', 'Min Købmand', 'chain')
ON CONFLICT (id) DO NOTHING;
