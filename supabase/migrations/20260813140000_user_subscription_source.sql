-- Hvor abonnementet kommer fra, så admin kan skelne Stripe (kan opsiges)
-- fra App Store / Play (kan ikke opsiges herfra).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_source text
    CHECK (subscription_source IN ('stripe', 'app_store', 'manual', 'unknown', 'none'));

UPDATE public.user_profiles
SET subscription_source = 'stripe'
WHERE stripe_subscription_id IS NOT NULL
  AND (subscription_source IS NULL OR subscription_source = '');

UPDATE public.user_profiles
SET subscription_source = 'unknown'
WHERE subscription_tier IN ('plus', 'premium')
  AND stripe_subscription_id IS NULL
  AND (subscription_source IS NULL OR subscription_source = '');

UPDATE public.user_profiles
SET subscription_source = 'none'
WHERE (subscription_tier IS NULL OR subscription_tier = 'free')
  AND stripe_subscription_id IS NULL
  AND (subscription_source IS NULL OR subscription_source = '');
Vi