-- Smart shopping link: delbar indkøbsside + SMS-tracking (kør i Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS smart_shopping_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES user_meal_plans (id) ON DELETE SET NULL,
  store_id INTEGER NOT NULL,
  store_name TEXT NOT NULL,
  store_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  shopping_list_prices JSONB,
  meal_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sms_sent_at TIMESTAMPTZ,
  sms_to TEXT,
  open_count INTEGER NOT NULL DEFAULT 0,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_smart_shopping_links_token ON smart_shopping_links (token);
CREATE INDEX IF NOT EXISTS idx_smart_shopping_links_user ON smart_shopping_links (user_id);
CREATE INDEX IF NOT EXISTS idx_smart_shopping_links_created ON smart_shopping_links (created_at DESC);

COMMENT ON TABLE smart_shopping_links IS 'Delbar indkøbsliste (mobil) med butik + tracking';

ALTER TABLE smart_shopping_links ENABLE ROW LEVEL SECURITY;

-- Ingen policies: kun service role (server) må læse/skrive
