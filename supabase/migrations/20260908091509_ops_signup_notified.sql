-- Idempotens for ops-mail ved ny bruger / nyt abonnement.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ops_signup_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS ops_paid_notified_at timestamptz;
