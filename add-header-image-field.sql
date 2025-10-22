-- Add header_image_url field to blog_posts table
ALTER TABLE blog_posts 
ADD COLUMN header_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN blog_posts.header_image_url IS 'URL for the header image displayed in blog post header';