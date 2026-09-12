CREATE TABLE IF NOT EXISTS public.diary_activity_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date DATE NOT NULL,
  title TEXT NOT NULL,
  calories INTEGER NOT NULL CHECK (calories > 0 AND calories <= 5000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diary_activity_user_date
  ON public.diary_activity_entries(user_id, logged_date DESC);

ALTER TABLE public.diary_activity_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own diary activity" ON public.diary_activity_entries;
CREATE POLICY "Users can manage own diary activity" ON public.diary_activity_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diary_activity_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diary_activity_entries TO service_role;
