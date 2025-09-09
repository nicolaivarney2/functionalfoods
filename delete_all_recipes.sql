-- SQL to delete all recipes from the database
DELETE FROM recipes;

-- Optional: Reset the sequence if you want to start recipe IDs from 1 again
-- ALTER SEQUENCE recipes_id_seq RESTART WITH 1;

-- Check how many recipes were deleted
SELECT 'Deleted all recipes' as status;
