-- Add week_number column to user_meal_plans if it doesn't exist
ALTER TABLE user_meal_plans 
ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_meal_plans_week_number 
ON user_meal_plans(user_id, week_number);

