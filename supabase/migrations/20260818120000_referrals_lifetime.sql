-- Henvisningsprogram: unik kode, tælling af oprettelser, Lifetime-flag (manuelt tildelt).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lifetime_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifetime_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS lifetime_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_reward_notified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_referral_code_unique
  ON public.user_profiles (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_profiles_referred_by_idx
  ON public.user_profiles (referred_by)
  WHERE referred_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_profiles_lifetime_access_idx
  ON public.user_profiles (lifetime_access)
  WHERE lifetime_access = true;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_no_self CHECK (referrer_id <> referee_id),
  CONSTRAINT referrals_referee_unique UNIQUE (referee_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx
  ON public.referrals (referrer_id, created_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own referrals given" ON public.referrals;
CREATE POLICY "Users read own referrals given"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users read own referral received" ON public.referrals;
CREATE POLICY "Users read own referral received"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referee_id);
