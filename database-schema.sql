-- Recipes table
CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  shortDescription TEXT,
  
  -- Timing
  preparationTime INTEGER,
  cookingTime INTEGER,
  totalTime INTEGER,
  
  -- Nutrition
  calories INTEGER,
  protein DECIMAL,
  carbs DECIMAL,
  fat DECIMAL,
  fiber DECIMAL,
  vitamins JSONB,
  minerals JSONB,
  totalCalories INTEGER,
  totalProtein DECIMAL,
  totalCarbs DECIMAL,
  totalFat DECIMAL,
  totalFiber DECIMAL,
  
  -- SEO
  metaTitle TEXT,
  metaDescription TEXT,
  keywords JSONB,
  
  -- Categories
  mainCategory TEXT,
  subCategories JSONB,
  dietaryCategories JSONB,
  
  -- Content
  ingredients JSONB,
  ingredientGroups JSONB,
  instructions JSONB,
  instructionGroups JSONB,
  
  -- Media
  imageUrl TEXT,
  imageAlt TEXT,
  
  -- Additional
  servings INTEGER,
  difficulty TEXT,
  author TEXT,
  publishedAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  
  -- SEO Rich Data
  rating DECIMAL,
  reviewCount INTEGER,
  prepTimeISO TEXT,
  cookTimeISO TEXT,
  totalTimeISO TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to recipes" ON recipes FOR SELECT USING (true);

-- Create policy for authenticated users to insert/update
CREATE POLICY "Allow authenticated users to insert recipes" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update recipes" ON recipes FOR UPDATE USING (true);

-- Ingredients table
CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  exclusions JSONB,
  allergens JSONB,
  commonNames JSONB,
  description TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  nutritionalInfo JSONB
);

-- Enable RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to ingredients" ON ingredients FOR SELECT USING (true);

-- Create policy for authenticated users to insert/update
CREATE POLICY "Allow authenticated users to insert ingredients" ON ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update ingredients" ON ingredients FOR UPDATE USING (true); 