-- Expo push-tokens pr. bruger (registreret af Functional Foods-appen).
-- Bruges af cron-jobbet /api/cron/price-alert-notify til at sende prisalarm-push.

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Brugeren administrerer kun sine egne tokens (appen upserter med sin session).
CREATE POLICY "Users manage own push tokens" ON public.user_push_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role (cron) kan læse alle tokens for at sende notifikationer.
CREATE POLICY "Service role reads push tokens" ON public.user_push_tokens
  FOR SELECT USING (auth.role() = 'service_role');
