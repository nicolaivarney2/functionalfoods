-- Create storage bucket for recipe images
-- Run this in your Supabase SQL editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/webp']
);

-- Create storage policy for public read access
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'recipe-images');

-- Create storage policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recipe-images' 
    AND auth.role() = 'authenticated'
  );

-- Create storage policy for authenticated users to update
CREATE POLICY "Authenticated users can update images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'recipe-images' 
    AND auth.role() = 'authenticated'
  );

-- Create storage policy for authenticated users to delete
CREATE POLICY "Authenticated users can delete images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'recipe-images' 
    AND auth.role() = 'authenticated'
  );
