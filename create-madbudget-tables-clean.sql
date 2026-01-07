-- Madbudget System Tables
-- This file creates tables for the madbudget meal planning system
-- Run this in Supabase SQL Editor

-- Adult weight loss profiles table
CREATE TABLE IF NOT EXISTS adult_weight_loss_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  adult_index INTEGER NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  age INTEGER,
  height INTEGER,
  weight DECIMAL(5,2),
  activity_level DECIMAL(3,2),
  dietary_approach TEXT,
  excluded_foods TEXT[] DEFAULT '{}',
  meals_per_day TEXT[] DEFAULT ARRAY['dinner'],
  weight_goal TEXT CHECK (weight_goal IN ('weight-loss', 'maintenance', 'muscle-gain')),
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, adult_index)
);

-- Enable RLS
ALTER TABLE adult_weight_loss_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for adult_weight_loss_profiles
CREATE POLICY "Users can view own adult profiles" ON adult_weight_loss_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adult profiles" ON adult_weight_loss_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adult profiles" ON adult_weight_loss_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own adult profiles" ON adult_weight_loss_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Update or create family_profiles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_profiles') THEN
    CREATE TABLE family_profiles (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
      adults INTEGER DEFAULT 2,
      children INTEGER DEFAULT 0,
      children_ages TEXT[] DEFAULT '{}',
      prioritize_organic BOOLEAN DEFAULT false,
      prioritize_animal_organic BOOLEAN DEFAULT false,
      excluded_ingredients TEXT[] DEFAULT '{}',
      selected_stores INTEGER[] DEFAULT '{}',
      variation_level INTEGER DEFAULT 2,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    ALTER TABLE family_profiles 
      ADD COLUMN IF NOT EXISTS children_ages TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS excluded_ingredients TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS selected_stores INTEGER[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS variation_level INTEGER DEFAULT 2;
  END IF;
END $$;

-- Enable RLS on family_profiles
ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own family profile" ON family_profiles;
DROP POLICY IF EXISTS "Users can insert own family profile" ON family_profiles;
DROP POLICY IF EXISTS "Users can update own family profile" ON family_profiles;
DROP POLICY IF EXISTS "Users can delete own family profile" ON family_profiles;

-- Create new policies for family_profiles
CREATE POLICY "Users can view own family profile" ON family_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family profile" ON family_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family profile" ON family_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own family profile" ON family_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Meal plans table
CREATE TABLE IF NOT EXISTS user_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  variation_level INTEGER DEFAULT 2,
  family_profile_snapshot JSONB,
  meal_plan_data JSONB NOT NULL,
  shopping_list JSONB,
  total_cost DECIMAL(10,2),
  total_savings DECIMAL(10,2),
  estimated_calories_per_day DECIMAL(8,2),
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for user_meal_plans
CREATE POLICY "Users can view own meal plans" ON user_meal_plans
  FOR SELECT USING (auth.uid() = user_id OR (is_shared = true AND share_token IS NOT NULL));

CREATE POLICY "Users can insert own meal plans" ON user_meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans" ON user_meal_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans" ON user_meal_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_adult_profiles_user_id ON adult_weight_loss_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_adult_profiles_user_adult ON adult_weight_loss_profiles(user_id, adult_index);
CREATE INDEX IF NOT EXISTS idx_family_profiles_user_id ON family_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON user_meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start ON user_meal_plans(week_start_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_share_token ON user_meal_plans(share_token) WHERE share_token IS NOT NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_adult_profiles_updated_at ON adult_weight_loss_profiles;
CREATE TRIGGER update_adult_profiles_updated_at
  BEFORE UPDATE ON adult_weight_loss_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_profiles_updated_at ON family_profiles;
CREATE TRIGGER update_family_profiles_updated_at
  BEFORE UPDATE ON family_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON user_meal_plans;
CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON user_meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

