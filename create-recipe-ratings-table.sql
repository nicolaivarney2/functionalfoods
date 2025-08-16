-- Create recipe_ratings table for storing user ratings
-- Run this in your Supabase SQL editor

-- Create the recipe_ratings table
CREATE TABLE IF NOT EXISTS recipe_ratings (
  id SERIAL PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one rating per user per recipe
  UNIQUE(recipe_id, user_id)
);

-- Enable RLS
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all ratings" ON recipe_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own ratings" ON recipe_ratings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own ratings" ON recipe_ratings
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own ratings" ON recipe_ratings
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe_id ON recipe_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_user_id ON recipe_ratings(user_id);

-- Verify the table was created
SELECT * FROM recipe_ratings LIMIT 0;
