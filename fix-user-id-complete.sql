-- 🔧 Fix User ID in Blog Posts
-- Kør dette script i din Supabase SQL editor

-- Opdater blog posts med dit rigtige User ID
UPDATE blog_posts 
SET author_id = '7775f5e7-d5cf-491c-b16c-4a9f2334f0ee'
WHERE author_id = (SELECT id FROM auth.users LIMIT 1);

-- Verificer at det virkede
SELECT 
  id,
  title,
  author_id,
  status,
  created_at
FROM blog_posts 
ORDER BY created_at DESC;
