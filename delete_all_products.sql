-- SQL to delete all supermarket products from the database
DELETE FROM supermarket_products;

-- Optional: Reset the sequence if you want to start product IDs from 1 again
-- ALTER SEQUENCE supermarket_products_id_seq RESTART WITH 1;

-- Check how many products were deleted
SELECT 'Deleted all supermarket products' as status;
