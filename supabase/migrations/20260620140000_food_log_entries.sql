-- Madlog (dagbog) — Lifesum-stil logning af måltider pr. dag.
-- Hver række er ét loggede element (en opskrift-portion) for en bruger på en dato.
-- Næringsværdierne er et snapshot (allerede gange antal portioner), så historikken
-- ikke ændrer sig hvis en opskrift senere genberegnes.

create table if not exists public.food_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null default (now() at time zone 'utc')::date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  source text not null default 'recipe' check (source in ('recipe', 'manual')),
  recipe_id text,
  recipe_slug text,
  title text not null,
  image_url text,
  servings numeric(6, 2) not null default 1,
  calories numeric(8, 2) not null default 0,
  protein numeric(8, 2),
  carbs numeric(8, 2),
  fat numeric(8, 2),
  fiber numeric(8, 2),
  created_at timestamptz not null default now()
);

create index if not exists food_log_entries_user_date_idx
  on public.food_log_entries (user_id, logged_date);

alter table public.food_log_entries enable row level security;

-- Idempotent: kan køres flere gange uden fejl.
drop policy if exists "Users manage own food log" on public.food_log_entries;
create policy "Users manage own food log" on public.food_log_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
