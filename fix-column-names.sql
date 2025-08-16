-- Fix column names in recipes table - rename from snake_case to camelCase
-- Run this in your Supabase SQL editor

-- First, let's see what columns we actually have
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recipes' 
ORDER BY ordinal_position;

-- Rename columns to match frontend expectations
-- Note: We'll use DO block to handle cases where columns might not exist

DO $$ 
BEGIN
    -- Rename timing columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'preparationtime') THEN
        ALTER TABLE recipes RENAME COLUMN preparationtime TO "preparationTime";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'cookingtime') THEN
        ALTER TABLE recipes RENAME COLUMN cookingtime TO "cookingTime";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'totaltime') THEN
        ALTER TABLE recipes RENAME COLUMN totaltime TO "totalTime";
    END IF;
    
    -- Rename description column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'shortdescription') THEN
        ALTER TABLE recipes RENAME COLUMN shortdescription TO "shortDescription";
    END IF;
    
    -- Rename category columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'maincategory') THEN
        ALTER TABLE recipes RENAME COLUMN maincategory TO "mainCategory";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'subcategories') THEN
        ALTER TABLE recipes RENAME COLUMN subcategories TO "subCategories";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'dietarycategories') THEN
        ALTER TABLE recipes RENAME COLUMN dietarycategories TO "dietaryCategories";
    END IF;
    
    -- Rename image columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'imageurl') THEN
        ALTER TABLE recipes RENAME COLUMN imageurl TO "imageUrl";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'imagealt') THEN
        ALTER TABLE recipes RENAME COLUMN imagealt TO "imageAlt";
    END IF;
    
    -- Rename date columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'publishedat') THEN
        ALTER TABLE recipes RENAME COLUMN publishedat TO "publishedAt";
    END IF;
    
    -- Rename meta columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'metatitle') THEN
        ALTER TABLE recipes RENAME COLUMN metatitle TO "metaTitle";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'metadescription') THEN
        ALTER TABLE recipes RENAME COLUMN metadescription TO "metaDescription";
    END IF;
    
    -- Rename review columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'reviewcount') THEN
        ALTER TABLE recipes RENAME COLUMN reviewcount TO "reviewCount";
    END IF;
    
    -- Rename created_at and updated_at (these might already be camelCase)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'created_at') THEN
        ALTER TABLE recipes RENAME COLUMN created_at TO "createdAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'updated_at') THEN
        ALTER TABLE recipes RENAME COLUMN updated_at TO "updatedAt";
    END IF;
    
END $$;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recipes' 
ORDER BY ordinal_position;
