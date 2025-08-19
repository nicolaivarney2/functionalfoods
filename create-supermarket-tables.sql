-- Create supermarket product database structure
-- This will store all products from different supermarkets with price history

-- Supermarkets table
CREATE TABLE IF NOT EXISTS supermarkets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default supermarkets
INSERT INTO supermarkets (name, slug, color) VALUES
  ('REMA 1000', 'rema1000', 'bg-blue-600'),
  ('Netto', 'netto', 'bg-yellow-500'),
  ('Føtex', 'foetex', 'bg-blue-500'),
  ('Bilka', 'bilka', 'bg-blue-700'),
  ('Nemlig.com', 'nemlig', 'bg-orange-500'),
  ('MENY', 'meny', 'bg-red-600'),
  ('Spar', 'spar', 'bg-red-500'),
  ('Løvbjerg', 'loevbjerg', 'bg-green-600')
ON CONFLICT (name) DO NOTHING;

-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(10),
  parent_id INTEGER REFERENCES product_categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default categories
INSERT INTO product_categories (name, slug, icon) VALUES
  ('Frugt og grønt', 'frugt-og-gront', '🍎'),
  ('Kød og fisk', 'kod-og-fisk', '🥩'),
  ('Mejeri og køl', 'mejeri-og-kol', '🥛'),
  ('Kolonial', 'kolonial', '🌾'),
  ('Frost', 'frost', '❄️'),
  ('Brød og kager', 'brod-og-kager', '🥐'),
  ('Drikkevarer', 'drikkevarer', '☕'),
  ('Slik og snacks', 'slik-og-snacks', '🍪'),
  ('Nemt og hurtigt', 'nemt-og-hurtigt', '⚡'),
  ('Diverse', 'diverse', '📦'),
  ('Baby og småbørn', 'baby-og-smaaborn', '👶'),
  ('Husholdning', 'husholdning', '🏠'),
  ('Personlig pleje', 'personlig-pleje', '🧴')
ON CONFLICT (slug) DO NOTHING;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(100), -- ID from supermarket API
  supermarket_id INTEGER REFERENCES supermarkets(id) NOT NULL,
  category_id INTEGER REFERENCES product_categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  brand VARCHAR(100),
  unit VARCHAR(50), -- stk, kg, g, l, ml, etc.
  unit_price DECIMAL(10,2), -- price per unit (kr/kg, kr/l, etc.)
  current_price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount_percentage INTEGER,
  is_on_sale BOOLEAN DEFAULT false,
  sale_start_date DATE,
  sale_end_date DATE,
  image_url TEXT,
  nutrition_info JSONB, -- Store nutrition data as JSON
  ingredients TEXT[],
  allergens TEXT[],
  is_organic BOOLEAN DEFAULT false,
  is_animal_organic BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Price history table for tracking price changes
CREATE TABLE IF NOT EXISTS product_price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_sale_price BOOLEAN DEFAULT false,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- User favorite products
CREATE TABLE IF NOT EXISTS user_favorite_products (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- User favorite stores
CREATE TABLE IF NOT EXISTS user_favorite_stores (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  supermarket_id INTEGER REFERENCES supermarkets(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, supermarket_id)
);

-- Family profiles
CREATE TABLE IF NOT EXISTS family_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  children_age INTEGER,
  prioritize_organic BOOLEAN DEFAULT false,
  prioritize_animal_organic BOOLEAN DEFAULT false,
  disliked_ingredients TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Basic items (pantry staples)
CREATE TABLE IF NOT EXISTS basic_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  is_essential BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert common basic items
INSERT INTO basic_items (name, category) VALUES
  ('Smør', 'Mejeri'),
  ('Olivenolie', 'Kolonial'),
  ('Salt', 'Kolonial'),
  ('Peber', 'Kolonial'),
  ('Hvidløg', 'Frugt og grønt'),
  ('Løg', 'Frugt og grønt'),
  ('Ris', 'Kolonial'),
  ('Pasta', 'Kolonial'),
  ('Mælk', 'Mejeri'),
  ('Æg', 'Mejeri'),
  ('Flormelis', 'Kolonial'),
  ('Bagepulver', 'Kolonial'),
  ('Vaniljesukker', 'Kolonial'),
  ('Citron', 'Frugt og grønt'),
  ('Kartofler', 'Frugt og grønt')
ON CONFLICT DO NOTHING;

-- User basic items inventory
CREATE TABLE IF NOT EXISTS user_basic_items (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  basic_item_id INTEGER REFERENCES basic_items(id) NOT NULL,
  is_owned BOOLEAN DEFAULT false,
  quantity INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, basic_item_id)
);

-- Meal plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name VARCHAR(255),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  total_cost DECIMAL(10,2),
  total_savings DECIMAL(10,2),
  is_shared BOOLEAN DEFAULT false,
  share_token VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Meal plan items
CREATE TABLE IF NOT EXISTS meal_plan_items (
  id SERIAL PRIMARY KEY,
  meal_plan_id INTEGER REFERENCES meal_plans(id) NOT NULL,
  day_of_week INTEGER NOT NULL, -- 1=Monday, 7=Sunday
  meal_type VARCHAR(20) NOT NULL, -- breakfast, lunch, dinner
  recipe_id INTEGER REFERENCES recipes(id), -- Link to existing recipes
  product_id INTEGER REFERENCES products(id), -- Or link to product if no recipe
  custom_meal_name VARCHAR(255),
  custom_meal_ingredients TEXT[],
  estimated_cost DECIMAL(10,2),
  estimated_savings DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shopping lists
CREATE TABLE IF NOT EXISTS shopping_lists (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  meal_plan_id INTEGER REFERENCES meal_plans(id),
  name VARCHAR(255) DEFAULT 'Indkøbsliste',
  total_cost DECIMAL(10,2),
  total_savings DECIMAL(10,2),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shopping list items
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id SERIAL PRIMARY KEY,
  shopping_list_id INTEGER REFERENCES shopping_lists(id) NOT NULL,
  product_id INTEGER REFERENCES products(id),
  basic_item_id INTEGER REFERENCES basic_items(id),
  custom_item_name VARCHAR(255),
  quantity DECIMAL(10,2) DEFAULT 1,
  unit VARCHAR(50),
  estimated_cost DECIMAL(10,2),
  is_checked BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_supermarket ON products(supermarket_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sale ON products(is_on_sale);
CREATE INDEX IF NOT EXISTS idx_products_organic ON products(is_organic);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON product_price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_user_favorites ON user_favorite_products(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_week ON meal_plans(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_basic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to products
CREATE POLICY "Public can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Public can view price history" ON product_price_history FOR SELECT USING (true);
CREATE POLICY "Public can view categories" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Public can view supermarkets" ON supermarkets FOR SELECT USING (true);
CREATE POLICY "Public can view basic items" ON basic_items FOR SELECT USING (true);

-- Create policies for authenticated users
CREATE POLICY "Users can manage their own favorites" ON user_favorite_products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own store preferences" ON user_favorite_stores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own family profile" ON family_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own basic items" ON user_basic_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own meal plans" ON meal_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own meal plan items" ON meal_plan_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own shopping lists" ON shopping_lists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own shopping list items" ON shopping_list_items FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_profiles_updated_at BEFORE UPDATE ON family_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_basic_items_updated_at BEFORE UPDATE ON user_basic_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
