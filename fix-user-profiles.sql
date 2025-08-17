-- Fix user_profiles by inserting with email from auth.users
INSERT INTO user_profiles (id, email, role) 
SELECT 
  au.id,
  au.email,
  'admin' as role
FROM auth.users au
WHERE au.id = '7775f5e7-d5cf-491c-b16c-4a9f2334f0ee'
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  role = 'admin',
  updated_at = NOW();

-- Verify the user was inserted/updated
SELECT 
  id, 
  email,
  role, 
  created_at,
  updated_at
FROM user_profiles 
WHERE id = '7775f5e7-d5cf-491c-b16c-4a9f2334f0ee';

-- Check if there are any other users that need admin role
SELECT 
  au.id,
  au.email,
  up.role
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.id = '7775f5e7-d5cf-491c-b16c-4a9f2334f0ee';
