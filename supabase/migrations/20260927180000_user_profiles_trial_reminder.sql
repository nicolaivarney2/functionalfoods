-- Markerer at mailen dagen før prøvens udløb er sendt, så den ikke sendes igen.
alter table public.user_profiles
  add column if not exists trial_reminder_sent_at timestamptz;
