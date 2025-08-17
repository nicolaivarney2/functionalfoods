-- Check if user_profiles table exists and show its structure
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'user_profiles'
) as table_exists;

-- If it exists, show its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check if there are any existing users
SELECT 
  id, 
  email,
  role, 
  created_at
FROM user_profiles 
LIMIT 5;
