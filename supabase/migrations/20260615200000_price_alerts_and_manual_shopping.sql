-- Price alerts + manual shopping items for logged-in users

CREATE TABLE IF NOT EXISTS public.user_price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  store_id text NOT NULL,
  product_offer_id text,
  product_name text NOT NULL,
  image_url text,
  threshold_type text NOT NULL CHECK (threshold_type IN ('any_sale', 'min_discount')),
  min_discount_pct integer,
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  last_notified_price_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_user_price_alerts_user_id ON public.user_price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_price_alerts_active ON public.user_price_alerts(user_id, is_active);

CREATE TABLE IF NOT EXISTS public.user_manual_shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'stk',
  product_offer_id text,
  product_id text,
  store_id text,
  image_url text,
  is_checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_manual_shopping_user_id ON public.user_manual_shopping_items(user_id);

-- Daily price snapshots keyed by product + store (for product page charts)
CREATE TABLE IF NOT EXISTS public.price_history (
  id bigserial PRIMARY KEY,
  product_id text NOT NULL,
  store_id text NOT NULL,
  price numeric NOT NULL,
  normal_price numeric,
  is_on_sale boolean NOT NULL DEFAULT false,
  snapshot_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, store_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_store_date
  ON public.price_history(product_id, store_id, snapshot_date DESC);

ALTER TABLE public.user_price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_manual_shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own price alerts" ON public.user_price_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own manual shopping items" ON public.user_manual_shopping_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read price history" ON public.price_history
  FOR SELECT USING (true);

CREATE POLICY "Service role manages price history" ON public.price_history
  FOR ALL USING (auth.role() = 'service_role');
