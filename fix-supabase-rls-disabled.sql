-- Fix Supabase linter: RLS Disabled in Public (ERROR)
-- Aktiverer RLS på tabeller uden det
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

-- Reference data (offentlig læsning, ingen skrivning fra client)
ALTER TABLE frida_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE frida_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE frida_nutrition_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_metadata ENABLE ROW LEVEL SECURITY;

-- Policies: kun SELECT for alle (reference data)
DROP POLICY IF EXISTS "Allow public read frida_ingredients" ON frida_ingredients;
CREATE POLICY "Allow public read frida_ingredients" ON frida_ingredients FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read frida_foods" ON frida_foods;
CREATE POLICY "Allow public read frida_foods" ON frida_foods FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read frida_nutrition_values" ON frida_nutrition_values;
CREATE POLICY "Allow public read frida_nutrition_values" ON frida_nutrition_values FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read scraping_metadata" ON scraping_metadata;
CREATE POLICY "Allow public read scraping_metadata" ON scraping_metadata FOR SELECT USING (true);

-- Service role bypasser RLS – ingen ekstra INSERT/UPDATE policy nødvendig for scraping

-- User data (kræver auth)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- Hvis policies allerede findes, ignorer fejl – kør create-user-profiles-table.sql først
DO $$
BEGIN
  CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE POLICY "Admins can update all profiles" ON user_profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- family_basisvarer – bruger-specifik
-- family_id kan være integer (FK til family_profiles.id) eller UUID (user_id)
ALTER TABLE family_basisvarer ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own family_basisvarer" ON family_basisvarer;
DO $$
DECLARE
  col_type text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'family_basisvarer' AND column_name = 'user_id') THEN
    CREATE POLICY "Users can manage own family_basisvarer" ON family_basisvarer FOR ALL USING (auth.uid() = user_id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'family_basisvarer' AND column_name = 'family_id') THEN
    SELECT data_type INTO col_type FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'family_basisvarer' AND column_name = 'family_id';
    IF col_type = 'uuid' THEN
      -- family_id er user_id (UUID)
      CREATE POLICY "Users can manage own family_basisvarer" ON family_basisvarer FOR ALL USING (family_id = auth.uid());
    ELSE
      -- family_id er integer (FK til family_profiles.id)
      CREATE POLICY "Users can manage own family_basisvarer" ON family_basisvarer FOR ALL USING (
        EXISTS (SELECT 1 FROM family_profiles fp WHERE fp.id = family_id AND fp.user_id = auth.uid())
      );
    END IF;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- secondary_shopping_list – bruger-specifik via family_id
ALTER TABLE secondary_shopping_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own secondary_shopping_list" ON secondary_shopping_list;
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'secondary_shopping_list' AND column_name = 'family_id';
  IF col_type = 'uuid' THEN
    CREATE POLICY "Users can manage own secondary_shopping_list" ON secondary_shopping_list FOR ALL USING (family_id = auth.uid());
  ELSE
    CREATE POLICY "Users can manage own secondary_shopping_list" ON secondary_shopping_list FOR ALL USING (
      EXISTS (SELECT 1 FROM family_profiles fp WHERE fp.id = family_id AND fp.user_id = auth.uid())
    );
  END IF;
END $$;

-- Blog – offentlig læsning, admin skrivning
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_content_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_hierarchy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read blog_posts" ON blog_posts;
CREATE POLICY "Allow public read blog_posts" ON blog_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read blog_categories" ON blog_categories;
CREATE POLICY "Allow public read blog_categories" ON blog_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read blog_comments" ON blog_comments;
CREATE POLICY "Allow public read blog_comments" ON blog_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read blog_search_analytics" ON blog_search_analytics;
CREATE POLICY "Allow public read blog_search_analytics" ON blog_search_analytics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read blog_content_sections" ON blog_content_sections;
CREATE POLICY "Allow public read blog_content_sections" ON blog_content_sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read blog_widgets" ON blog_widgets;
CREATE POLICY "Allow public read blog_widgets" ON blog_widgets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read blog_hierarchy" ON blog_hierarchy;
CREATE POLICY "Allow public read blog_hierarchy" ON blog_hierarchy FOR SELECT USING (true);

-- Blog skrivning – authenticated eller service_role (admin bruger typisk service_role)
DO $$
BEGIN
  CREATE POLICY "Allow authenticated blog_posts" ON blog_posts FOR ALL USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- blog_comments: INSERT for alle (anonyme kommentarer), UPDATE/DELETE for authenticated
DO $$
BEGIN
  CREATE POLICY "Allow insert blog_comments" ON blog_comments FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE POLICY "Allow authenticated update delete blog_comments" ON blog_comments FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE POLICY "Allow authenticated delete blog_comments" ON blog_comments FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE POLICY "Allow authenticated blog_search_analytics" ON blog_search_analytics FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- reddit_communities – offentlig læsning
ALTER TABLE reddit_communities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read reddit_communities" ON reddit_communities;
CREATE POLICY "Allow public read reddit_communities" ON reddit_communities FOR SELECT USING (true);
