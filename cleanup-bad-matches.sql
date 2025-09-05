-- Clean up all bad matches from product_ingredient_matches table
-- This will delete all matches and start fresh

DELETE FROM product_ingredient_matches;

-- Verify the table is empty
SELECT COUNT(*) as remaining_matches FROM product_ingredient_matches;
