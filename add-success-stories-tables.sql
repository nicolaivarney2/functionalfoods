-- Success stories (self-reported weight loss stories)
-- Run in Supabase SQL Editor before using /succeshistorier page.

create extension if not exists pgcrypto;

create table if not exists public.success_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  headline text not null check (char_length(headline) between 6 and 140),
  display_name text not null check (char_length(display_name) between 2 and 80),
  dietary_approach text not null check (char_length(dietary_approach) <= 60),
  exercised boolean not null default false,
  story_text text not null check (char_length(story_text) between 20 and 3000),
  tips_text text,
  weight_loss_kg numeric(6,2) not null check (weight_loss_kg > 0),
  before_weight_kg numeric(6,2) check (before_weight_kg > 0),
  after_weight_kg numeric(6,2) check (after_weight_kg > 0),
  duration_weeks integer check (duration_weeks is null or duration_weeks between 1 and 520),
  reported_at date not null default current_date,
  before_image_path text not null,
  after_image_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_note text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.success_stories
  add column if not exists headline text;

alter table public.success_stories
  add column if not exists weight_loss_kg numeric(6,2);

update public.success_stories
set headline = coalesce(headline, display_name || ' succeshistorie')
where headline is null;

update public.success_stories
set weight_loss_kg = greatest(before_weight_kg - after_weight_kg, 0.1)
where weight_loss_kg is null
  and before_weight_kg is not null
  and after_weight_kg is not null
  and before_weight_kg > after_weight_kg;

alter table public.success_stories
  alter column headline set not null;

alter table public.success_stories
  alter column before_weight_kg drop not null;

alter table public.success_stories
  alter column after_weight_kg drop not null;

alter table public.success_stories
  drop constraint if exists success_stories_before_gt_after;

create index if not exists success_stories_status_reported_idx
  on public.success_stories(status, reported_at desc);

create index if not exists success_stories_user_status_idx
  on public.success_stories(user_id, status);

drop index if exists success_stories_one_active_per_user_idx;

alter table public.success_stories enable row level security;

drop policy if exists "success stories own read" on public.success_stories;
create policy "success stories own read"
  on public.success_stories
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "success stories own insert" on public.success_stories;
create policy "success stories own insert"
  on public.success_stories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "success stories own update pending" on public.success_stories;
create policy "success stories own update pending"
  on public.success_stories
  for update
  to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

insert into storage.buckets (id, name, public)
values ('success-stories', 'success-stories', false)
on conflict (id) do nothing;
