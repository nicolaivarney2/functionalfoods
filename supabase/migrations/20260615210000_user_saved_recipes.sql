-- Saved recipes (favorites) synced across devices

CREATE TABLE IF NOT EXISTS public.user_saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id text NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_recipes_user_id ON public.user_saved_recipes(user_id);

ALTER TABLE public.user_saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved recipes" ON public.user_saved_recipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
