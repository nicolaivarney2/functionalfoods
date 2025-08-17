-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Insert current user as admin (replace with your actual user ID)
-- You can find your user ID in the browser console or from the useAdminAuth hook
INSERT INTO user_profiles (id, role) 
VALUES ('7775f5e7-d5cf-491c-b16c-4a9f2334f0ee', 'admin')
ON CONFLICT (id) DO UPDATE SET 
  role = 'admin',
  updated_at = NOW();

-- Verify the table was created
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'user_profiles';

-- Verify your user has admin role
SELECT 
  id, 
  role, 
  created_at 
FROM user_profiles 
WHERE id = '7775f5e7-d5cf-491c-b16c-4a9f2334f0ee';
