-- Abonnementsniveauer: free (3 madplaner/uge, 3 prisalarmer), plus (29 kr), premium (249 kr).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'plus', 'premium'));

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE TABLE IF NOT EXISTS public.meal_plan_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_generation_log_user_week
  ON public.meal_plan_generation_log (user_id, created_at DESC);

ALTER TABLE public.meal_plan_generation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own meal plan generation log" ON public.meal_plan_generation_log;
CREATE POLICY "Users read own meal plan generation log" ON public.meal_plan_generation_log
  FOR SELECT USING (auth.uid() = user_id);
