-- 🎯 Enhanced Blog System for Functionalfoods
-- State-of-the-art blog system with hierarchical structure and structured content

-- ========================================
-- PART 1: ENHANCED BLOG POSTS TABLE
-- ========================================

-- Add new columns to existing blog_posts table
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'blog' CHECK (post_type IN ('core', 'blog'));
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES blog_posts(id);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_evidence_based BOOLEAN DEFAULT FALSE;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS disclaimer_text TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS breadcrumb_path TEXT[]; -- Array for breadcrumb navigation

-- ========================================
-- PART 2: BLOG CONTENT SECTIONS
-- ========================================

-- Create blog content sections table for structured content
CREATE TABLE IF NOT EXISTS blog_content_sections (
  id SERIAL PRIMARY KEY,
  blog_post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('introduction', 'content', 'widget', 'conclusion')),
  section_order INTEGER NOT NULL,
  title TEXT, -- For content sections (auto-generates TOC)
  content TEXT, -- Main content
  image_url TEXT, -- Image for content sections
  widget_id INTEGER, -- For widget sections
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- PART 3: BLOG WIDGETS
-- ========================================

-- Create blog widgets table for reusable components
CREATE TABLE IF NOT EXISTS blog_widgets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('reddit_community', 'cta_button', 'related_posts', 'newsletter_signup', 'product_recommendation')),
  title TEXT,
  content TEXT, -- JSON content for widget
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- PART 4: BLOG HIERARCHY STRUCTURE
-- ========================================

-- Create blog hierarchy table for core articles and their relationships
CREATE TABLE IF NOT EXISTS blog_hierarchy (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES blog_hierarchy(id),
  blog_post_id INTEGER REFERENCES blog_posts(id),
  level INTEGER NOT NULL, -- 1 = main category, 2 = subcategory, 3 = specific topic
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- PART 5: INSERT DEFAULT DATA
-- ========================================

-- Insert Keto category if not exists
INSERT INTO blog_categories (name, slug, description, color) 
VALUES ('Keto', 'keto', 'Ketogen diæt og low-carb livsstil', '#10B981')
ON CONFLICT (slug) DO NOTHING;

-- Insert default widgets
INSERT INTO blog_widgets (name, widget_type, title, content) VALUES
('Reddit Keto Community', 'reddit_community', 'Join Keto Community', '{"subreddit": "keto", "description": "Connect with other keto enthusiasts"}'),
('Newsletter Signup', 'newsletter_signup', 'Få Keto Tips', '{"placeholder": "Din email", "button_text": "Tilmeld"}'),
('Related Keto Posts', 'related_posts', 'Relaterede Artikler', '{"limit": 3, "category": "keto"}')
ON CONFLICT DO NOTHING;

-- ========================================
-- PART 6: CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_blog_posts_type ON blog_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_parent ON blog_posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_content_sections_post ON blog_content_sections(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_content_sections_order ON blog_content_sections(blog_post_id, section_order);
CREATE INDEX IF NOT EXISTS idx_blog_hierarchy_parent ON blog_hierarchy(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_hierarchy_level ON blog_hierarchy(level);

-- ========================================
-- PART 7: UPDATE EXISTING POSTS
-- ========================================

-- Update existing posts to be 'blog' type
UPDATE blog_posts SET post_type = 'blog' WHERE post_type IS NULL;

-- Set breadcrumb paths for existing posts
UPDATE blog_posts 
SET breadcrumb_path = ARRAY['Keto', 'Blogs']
WHERE category_id = (SELECT id FROM blog_categories WHERE slug = 'keto');
