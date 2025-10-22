-- 🎯 Reddit Communities Database Setup
-- Kør dette script i din Supabase SQL editor

-- Create reddit_communities table
CREATE TABLE IF NOT EXISTS reddit_communities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, -- "Keto Community"
  subreddit TEXT NOT NULL UNIQUE, -- "keto" (without r/)
  description TEXT,
  category TEXT NOT NULL, -- "Keto", "LCHF/Paleo", etc.
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default Reddit communities
INSERT INTO reddit_communities (name, subreddit, description, category, member_count, sort_order) VALUES
('Keto Community', 'keto', 'The main keto subreddit with recipes, tips, and support', 'Keto', 2000000, 1),
('Keto Recipes', 'ketorecipes', 'Delicious keto recipes and meal ideas', 'Keto', 500000, 2),
('Keto Science', 'ketoscience', 'Scientific discussions about ketogenic diet', 'Keto', 100000, 3),
('LCHF', 'lchf', 'Low Carb High Fat diet community', 'LCHF/Paleo', 50000, 4),
('Paleo', 'paleo', 'Paleolithic diet and lifestyle', 'LCHF/Paleo', 200000, 5),
('Meal Prep Sunday', 'MealPrepSunday', 'Weekly meal preparation ideas and recipes', 'Meal Prep', 800000, 6),
('Anti-Inflammatory', 'AntiInflammatory', 'Foods and lifestyle for reducing inflammation', 'Anti-inflammatory', 25000, 7),
('Flexitarian', 'flexitarian', 'Flexible vegetarian diet community', 'Flexitarian', 30000, 8),
('Intermittent Fasting', 'intermittentfasting', 'IF and time-restricted eating', '5:2 Diet', 400000, 9),
('Family Cooking', 'cooking', 'General cooking tips and family meals', 'Family Food', 3000000, 10)
ON CONFLICT (subreddit) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reddit_communities_category ON reddit_communities(category);
CREATE INDEX IF NOT EXISTS idx_reddit_communities_active ON reddit_communities(is_active);
CREATE INDEX IF NOT EXISTS idx_reddit_communities_sort ON reddit_communities(sort_order);
