-- Madbudget: ugentlig indkøbsundersøgelse (hvor handlede du / hvorfor)
-- Kør i Supabase SQL Editor

CREATE TABLE IF NOT EXISTS madbudget_shop_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_week_start DATE NOT NULL,
  referenced_week_start DATE NOT NULL,
  store_id INTEGER,
  store_name TEXT NOT NULL,
  shop_reason TEXT NOT NULL CHECK (shop_reason IN ('cheapest', 'closest', 'prefer_anyway', 'other')),
  other_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, prompt_week_start)
);

CREATE INDEX IF NOT EXISTS idx_madbudget_shop_survey_user ON madbudget_shop_survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_madbudget_shop_survey_prompt_week ON madbudget_shop_survey_responses(prompt_week_start);

ALTER TABLE madbudget_shop_survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shop survey responses" ON madbudget_shop_survey_responses;
DROP POLICY IF EXISTS "Users can insert own shop survey responses" ON madbudget_shop_survey_responses;

CREATE POLICY "Users can view own shop survey responses" ON madbudget_shop_survey_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shop survey responses" ON madbudget_shop_survey_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE madbudget_shop_survey_responses IS 'Per user, one row per calendar week (prompt_week_start = Monday user was asked). referenced_week_start = Monday of week the question is about.';
