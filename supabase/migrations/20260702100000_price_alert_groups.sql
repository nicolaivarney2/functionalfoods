-- Grupperede prisalarmer (bulk / søge-baseret)

CREATE TABLE IF NOT EXISTS public.user_price_alert_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  search_query text NOT NULL,
  threshold_type text NOT NULL CHECK (threshold_type IN ('any_sale', 'min_discount')),
  min_discount_pct integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_price_alert_groups_user_id
  ON public.user_price_alert_groups(user_id);

CREATE INDEX IF NOT EXISTS idx_user_price_alert_groups_active
  ON public.user_price_alert_groups(user_id, is_active);

ALTER TABLE public.user_price_alerts
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.user_price_alert_groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_price_alerts_group_id
  ON public.user_price_alerts(group_id);

CREATE TABLE IF NOT EXISTS public.user_price_alert_meta (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_price_alert_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_price_alert_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own price alert groups" ON public.user_price_alert_groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own price alert meta" ON public.user_price_alert_meta
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
