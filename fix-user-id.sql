-- 🔧 Fix User ID in Blog Posts
-- Kør dette EFTER du har fundet dit User ID

-- Først: Find dit User ID
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Derefter: Opdater blog posts med dit User ID
-- Erstat 'YOUR_USER_ID_HERE' med dit rigtige User ID fra ovenstående query

UPDATE blog_posts 
SET author_id = 'YOUR_USER_ID_HERE'
WHERE author_id = (SELECT id FROM auth.users LIMIT 1);
