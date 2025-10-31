-- 🎯 Blog System Database Schema
-- Kør dette script i din Supabase SQL editor

-- Create blog categories table
CREATE TABLE IF NOT EXISTS blog_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- "Keto", "LCHF", "Paleo", etc.
  slug TEXT NOT NULL UNIQUE, -- "keto", "lchf", "paleo"
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Hex color for UI
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT, -- Short description for listings
  content TEXT NOT NULL, -- Full blog content (markdown/HTML)
  category_id INTEGER REFERENCES blog_categories(id) NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- SEO fields
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[], -- Array of tags
  
  -- Status and visibility
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT FALSE, -- For featured posts swiper
  published_at TIMESTAMP,
  
  -- Reddit integration
  reddit_post_id TEXT, -- Reddit post ID if cross-posted
  reddit_subreddit TEXT, -- Subreddit name
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create blog comments table
CREATE TABLE IF NOT EXISTS blog_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  parent_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE, -- For threading
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT, -- For anonymous comments
  author_email TEXT, -- For anonymous comments
  content TEXT NOT NULL,
  
  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMP,
  
  -- Reddit integration
  reddit_comment_id TEXT, -- If imported from Reddit
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create blog search analytics table
CREATE TABLE IF NOT EXISTS blog_search_analytics (
  id SERIAL PRIMARY KEY,
  search_query TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id), -- NULL for anonymous
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON blog_comments(status);
CREATE INDEX IF NOT EXISTS idx_blog_search_analytics_query ON blog_search_analytics(search_query);

-- Enable RLS (Row Level Security)
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_search_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for blog_categories
CREATE POLICY "Anyone can view blog categories" ON blog_categories 
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage blog categories" ON blog_categories 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create RLS policies for blog_posts
CREATE POLICY "Anyone can view published blog posts" ON blog_posts 
  FOR SELECT USING (status = 'published');

CREATE POLICY "Authors can view their own posts" ON blog_posts 
  FOR SELECT USING (author_id = auth.uid());

CREATE POLICY "Authors can manage their own posts" ON blog_posts 
  FOR ALL USING (author_id = auth.uid());

CREATE POLICY "Admins can manage all posts" ON blog_posts 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create RLS policies for blog_comments
CREATE POLICY "Anyone can view approved comments" ON blog_comments 
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Anyone can create comments" ON blog_comments 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Comment authors can update their own comments" ON blog_comments 
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Admins can moderate all comments" ON blog_comments 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create RLS policies for blog_search_analytics
CREATE POLICY "Anyone can create search analytics" ON blog_search_analytics 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view search analytics" ON blog_search_analytics 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_blog_categories_updated_at 
  BEFORE UPDATE ON blog_categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at 
  BEFORE UPDATE ON blog_posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_comments_updated_at 
  BEFORE UPDATE ON blog_comments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO blog_categories (name, slug, description, color) VALUES
('Keto', 'keto', 'Ketogen diæt og lav-kulhydrat livsstil', '#8B5CF6'),
('LCHF', 'lchf', 'Lav-kulhydrat, høj-fedt diæt', '#10B981'),
('Paleo', 'paleo', 'Paleo diæt og naturlig kost', '#F59E0B'),
('Vægttab', 'vaegttab', 'Generel vægttab og sundhed', '#EF4444'),
('Træning', 'traening', 'Fitness og træning', '#06B6D4'),
('Sundhed', 'sundhed', 'Generel sundhed og velvære', '#84CC16')
ON CONFLICT (slug) DO NOTHING;

-- Create function to update comment count
CREATE OR REPLACE FUNCTION update_blog_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE blog_posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      UPDATE blog_posts 
      SET comment_count = comment_count + 1 
      WHERE id = NEW.post_id;
    ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
      UPDATE blog_posts 
      SET comment_count = comment_count - 1 
      WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE blog_posts 
    SET comment_count = comment_count - 1 
    WHERE id = OLD.post_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger to update comment count
CREATE TRIGGER update_blog_post_comment_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_comment_count();
