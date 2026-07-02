-- Historiske skridt fra app (Apple Sundhed / Health Connect) — én række pr. bruger/dag.
CREATE TABLE IF NOT EXISTS step_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  adult_index INTEGER NOT NULL DEFAULT 0,
  steps INTEGER NOT NULL CHECK (steps >= 0),
  active_kcal INTEGER CHECK (active_kcal IS NULL OR active_kcal >= 0),
  logged_date DATE NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, adult_index, logged_date)
);

CREATE INDEX IF NOT EXISTS idx_step_log_user_date
  ON step_log_entries(user_id, adult_index, logged_date DESC);

ALTER TABLE step_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own step logs" ON step_log_entries;
CREATE POLICY "Users can manage own step logs" ON step_log_entries
  FOR ALL USING (auth.uid() = user_id);
