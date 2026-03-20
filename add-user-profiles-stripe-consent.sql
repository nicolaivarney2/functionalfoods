-- Billing, consent og støtte (Stripe / pay-what-you-can) på user_profiles
-- Kør i Supabase SQL Editor efter behov.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS product_updates_consent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS product_updates_consent_at TIMESTAMPTZ;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_contribution_amount_ore INTEGER;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_contribution_at TIMESTAMPTZ;

-- Tillad at brugere opretter egen profil-række (fx efter signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
