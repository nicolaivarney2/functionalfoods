-- Vægt-tracker: vægtlog, mål og progress-fotos + udvidelse af voksenprofiler.
-- Porteret fra add-weight-tracker-tables.sql (repo-roden) til en rigtig migration,
-- så app og web deler præcis samme skema. Idempotent — kan køres flere gange.
--
-- Storage: bucket "weight-progress" skal være PRIVAT (ikke public). Upload sker kun
-- via API med service role; visning via kortlivede signed URLs (se /api/weight-tracker/photos).

ALTER TABLE adult_weight_loss_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS target_weight_kg DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS weight_goal_target_date DATE;

CREATE TABLE IF NOT EXISTS weight_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  adult_index INTEGER NOT NULL,
  weight_kg DECIMAL(5, 2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_log_user_adult ON weight_log_entries(user_id, adult_index);
CREATE INDEX IF NOT EXISTS idx_weight_log_logged_at ON weight_log_entries(user_id, adult_index, logged_at DESC);

ALTER TABLE weight_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own weight logs" ON weight_log_entries;
CREATE POLICY "Users can manage own weight logs" ON weight_log_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS weight_progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  adult_index INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  photo_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_photos_user ON weight_progress_photos(user_id, adult_index);

ALTER TABLE weight_progress_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own weight photos" ON weight_progress_photos;
CREATE POLICY "Users can manage own weight photos" ON weight_progress_photos
  FOR ALL USING (auth.uid() = user_id);
