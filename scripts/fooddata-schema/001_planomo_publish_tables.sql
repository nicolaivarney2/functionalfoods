-- Kør i grocery Supabase (GROCERY_SUPABASE_URL).
-- Fælles kurering: Planomo + FF publicerer matches/tags hertil. FF scraper/syncer katalog og tilbud.
-- product_external_id = source_chain || '-' || source_id (samme som Planomo products.id).
-- Kør derefter: scripts/fooddata-schema/002_shared_curation_source.sql

-- ─── Ingrediens ↔ produkt matches ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_ingredient_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id text NOT NULL,
  product_external_id text NOT NULL,
  confidence integer DEFAULT 100,
  is_manual boolean DEFAULT true,
  match_type text DEFAULT 'manual',
  product_name_snapshot text,
  product_store_snapshot text,
  last_known_price numeric,
  source text DEFAULT 'planomo' NOT NULL
    CHECK (source IN ('planomo', 'ff')),
  synced_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (product_external_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_pim_ingredient
  ON public.product_ingredient_matches (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_pim_product
  ON public.product_ingredient_matches (product_external_id);
CREATE INDEX IF NOT EXISTS idx_pim_synced_at
  ON public.product_ingredient_matches (synced_at DESC);

COMMENT ON TABLE public.product_ingredient_matches IS
  'Fælles ingrediens↔produkt kurering (planomo|ff). Union merge.';

-- ─── Match-kø (nye varer uden ingrediens) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_ingredient_match_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL UNIQUE,
  store_product_id text NOT NULL,
  store_id text NOT NULL,
  product_name_snapshot text,
  queued_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'matched', 'dismissed')),
  resolved_at timestamptz,
  source text DEFAULT 'planomo' NOT NULL
    CHECK (source IN ('planomo', 'ff')),
  synced_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS product_ingredient_match_queue_pending_queued
  ON public.product_ingredient_match_queue (queued_at DESC)
  WHERE status = 'pending';

COMMENT ON TABLE public.product_ingredient_match_queue IS
  'Fælles match-kø. Én række pr. product_id.';

-- ─── Fravalg-tags på ingredienser ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ingredient_dietary_tags (
  ingredient_id text PRIMARY KEY,
  food_exclusions text[] DEFAULT ARRAY[]::text[] NOT NULL,
  source text DEFAULT 'planomo' NOT NULL
    CHECK (source IN ('planomo', 'ff')),
  synced_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingredient_dietary_tags_synced
  ON public.ingredient_dietary_tags (synced_at DESC);

COMMENT ON TABLE public.ingredient_dietary_tags IS
  'Fælles fravalg-tags (pork, gluten, …). ingredient_id = samme string i Planomo og FF.';

-- ─── Øko-tags på varer (produktniveau) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_organic_tags (
  product_external_id text PRIMARY KEY,
  organic_tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
  source text DEFAULT 'planomo' NOT NULL
    CHECK (source IN ('planomo', 'ff')),
  synced_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_organic_tags_synced
  ON public.product_organic_tags (synced_at DESC);

COMMENT ON TABLE public.product_organic_tags IS
  'Fælles øko-tags (organic-priority, organic-animal) pr. vare.';
