-- Add shared_by_name to user_meal_plans for "XX madplan" display
ALTER TABLE user_meal_plans
ADD COLUMN IF NOT EXISTS shared_by_name TEXT;
