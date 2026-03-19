-- Add shopping_list_prices to user_meal_plans for cached prices when sharing
-- Prices are fetched once at share time, so visitors don't trigger API calls
ALTER TABLE user_meal_plans
ADD COLUMN IF NOT EXISTS shopping_list_prices JSONB;

COMMENT ON COLUMN user_meal_plans.shopping_list_prices IS 'Cached store prices for shared plans: { "rema-1000": { "itemName": { name, price, totalPrice, isOnSale } } }';
