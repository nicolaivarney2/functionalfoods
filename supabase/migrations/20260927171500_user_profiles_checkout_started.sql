-- Sættes når web-signup starter Stripe Checkout. Ryddes ikke ved opsigelse,
-- så en annulleret prøve ikke falder tilbage til de gratis madplaner.
alter table public.user_profiles
  add column if not exists checkout_started boolean not null default false;

update public.user_profiles
set checkout_started = true
where stripe_subscription_id is not null;
