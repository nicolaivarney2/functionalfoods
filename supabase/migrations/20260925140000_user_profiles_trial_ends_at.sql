-- 14 dages fuld prøveperiode fra oprettelse.
alter table public.user_profiles
  add column if not exists trial_ends_at timestamptz;

update public.user_profiles
set trial_ends_at = created_at + interval '14 days'
where trial_ends_at is null and created_at is not null;
