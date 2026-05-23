-- Kommentarer på opskrifter (med threading via parent_id) og likes på kommentarer.
-- Auto-publishing: indloggede brugeres kommentarer vises med det samme.

CREATE TABLE IF NOT EXISTS public.recipe_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_slug TEXT NOT NULL,
  parent_id UUID REFERENCES public.recipe_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.recipe_comments IS
  'Kommentarer på opskrifter. parent_id = NULL er topniveau-kommentarer; ellers et svar.';

CREATE INDEX IF NOT EXISTS recipe_comments_recipe_slug_idx
  ON public.recipe_comments (recipe_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS recipe_comments_parent_id_idx
  ON public.recipe_comments (parent_id);

CREATE INDEX IF NOT EXISTS recipe_comments_author_id_idx
  ON public.recipe_comments (author_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_recipe_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recipe_comments_updated_at ON public.recipe_comments;
CREATE TRIGGER trg_recipe_comments_updated_at
  BEFORE UPDATE ON public.recipe_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_recipe_comments_updated_at();

ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

-- Alle (også anonyme) må læse kommentarer
DROP POLICY IF EXISTS "Anyone can read recipe comments" ON public.recipe_comments;
CREATE POLICY "Anyone can read recipe comments" ON public.recipe_comments
  FOR SELECT USING (true);

-- Kun indloggede brugere må oprette, og kun som sig selv
DROP POLICY IF EXISTS "Authenticated can insert own recipe comments" ON public.recipe_comments;
CREATE POLICY "Authenticated can insert own recipe comments" ON public.recipe_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Forfattere må opdatere egne kommentarer
DROP POLICY IF EXISTS "Authors can update own recipe comments" ON public.recipe_comments;
CREATE POLICY "Authors can update own recipe comments" ON public.recipe_comments
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- Forfattere må slette egne kommentarer
DROP POLICY IF EXISTS "Authors can delete own recipe comments" ON public.recipe_comments;
CREATE POLICY "Authors can delete own recipe comments" ON public.recipe_comments
  FOR DELETE USING (auth.uid() = author_id);


-- ===== Likes =====
CREATE TABLE IF NOT EXISTS public.recipe_comment_likes (
  comment_id UUID NOT NULL REFERENCES public.recipe_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

COMMENT ON TABLE public.recipe_comment_likes IS
  'Likes på kommentarer. Sammensat primærnøgle sikrer max ét like pr. (kommentar, bruger).';

CREATE INDEX IF NOT EXISTS recipe_comment_likes_comment_id_idx
  ON public.recipe_comment_likes (comment_id);

CREATE INDEX IF NOT EXISTS recipe_comment_likes_user_id_idx
  ON public.recipe_comment_likes (user_id);

ALTER TABLE public.recipe_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read recipe comment likes" ON public.recipe_comment_likes;
CREATE POLICY "Anyone can read recipe comment likes" ON public.recipe_comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like as themselves" ON public.recipe_comment_likes;
CREATE POLICY "Users can like as themselves" ON public.recipe_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike own likes" ON public.recipe_comment_likes;
CREATE POLICY "Users can unlike own likes" ON public.recipe_comment_likes
  FOR DELETE USING (auth.uid() = user_id);
