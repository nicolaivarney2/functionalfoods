-- ManyChat / Messenger integration: schema for linking + sync throttling.
-- Kør i Supabase SQL Editor. Brugerdata forbliver i FF; ManyChat får kun afledt kontekst via API.
-- (Kopi: sql/add-manychat-integration.sql — samme indhold, hvis du leder i sql/-mappen.)

-- 1) Kobling FF-bruger ↔ ManyChat subscriber (efter Messenger-opt-in)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS manychat_subscriber_id TEXT;

COMMENT ON COLUMN public.user_profiles.manychat_subscriber_id IS 'ManyChat subscriber id (Messenger); NULL indtil koblet via ref-token';

-- 2) Seneste kontekst-sync til ManyChat (throttle webhook)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS manychat_context_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.manychat_context_synced_at IS 'Sidste gang agent-kontekst blev skubbet til ManyChat for denne bruger';

-- 3) Engangstokens til m.me ref (ff_link--<token>)
CREATE TABLE IF NOT EXISTS public.messenger_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messenger_link_tokens_expires ON public.messenger_link_tokens (expires_at);

COMMENT ON TABLE public.messenger_link_tokens IS 'Kortlivede tokens til Messenger ref-URL; kun service role må læse/skrive';

ALTER TABLE public.messenger_link_tokens ENABLE ROW LEVEL SECURITY;

-- Ingen policies: kun service role (server) har adgang
